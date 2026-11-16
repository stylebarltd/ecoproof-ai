import Anthropic from "@anthropic-ai/sdk";
import { query } from "./db";
import { addAlias, addProduct, ProductError } from "./products";
import {
  asksType, isPackaging, isType, MAX_PIECES, PRODUCT_CATEGORIES, PRODUCT_NAME_MAX, PRODUCT_TYPES, TYPE_LABELS, TYPES_BY_CATEGORY,
  type ProductCategory, type ProductType,
} from "./productRules";

// A shop's catalogue, sent by its plugin (WooCommerce today), so the owner doesn't type every product: each product arrives with the
// shop system's number, the AI proposes what kind it is and how many pieces are in the pack, and the owner confirms, corrects or skips
// in the wizard. Nothing here is a declared product until the owner adds it (docs/eco-product-standard.md: the shop declares).

export type SentProduct = { id: number; name: string; main?: number; variations?: { id: number; label: string }[] };

const MAX_SENT = 1000;
const clean = (v: unknown, n: number) => String(v ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

/** Keeps only what is needed: numbers, names and variation labels. Prices, stock and descriptions are never read. */
export function parseCatalogue(payload: unknown): SentProduct[] | null {
  const list = (payload as { products?: unknown } | null)?.products;
  if (!Array.isArray(list)) return null;
  const out: SentProduct[] = [];
  for (const p of list.slice(0, MAX_SENT) as Record<string, unknown>[]) {
    const id = Math.round(Number(p?.id)), name = clean(p?.name, PRODUCT_NAME_MAX);
    if (!(id > 0) || name.length < 2) continue;
    const main = Math.round(Number(p?.main));
    const variations = (Array.isArray(p?.variations) ? (p.variations as Record<string, unknown>[]) : [])
      .map((v) => ({ id: Math.round(Number(v?.id)), label: clean(v?.label, 60) })).filter((v) => v.id > 0 && v.label).slice(0, 50);
    out.push({ id, name, ...(main > 0 && main !== id ? { main } : {}), ...(variations.length ? { variations } : {}) });
  }
  return out;
}

type Proposal = { type: ProductType | null; pieces: number; perVariation: number[] | null };

/**
 * Stores what the plugin sent. New products get the AI's proposal; a product whose variations are different pack sizes becomes one row
 * per variation. Rows the owner already decided, and products already on the shop's list under that number, are left alone; names are
 * refreshed. Returns how many are waiting for the owner.
 */
export async function receiveCatalogue(placeId: string, sent: SentProduct[]): Promise<{ received: number; open: number }> {
  const [rows, listed] = await Promise.all([
    query<{ key: string }>("SELECT key FROM catalogue_items WHERE place_id=$1", [placeId]),
    query<{ k: string }>(
      `SELECT lower(p.receipt_name) AS k FROM products p WHERE p.place_id=$1
       UNION SELECT lower(a.receipt_name_variant) FROM product_aliases a JOIN products p ON p.id = a.product_id WHERE p.place_id=$1`, [placeId],
    ),
  ]);
  const have = new Set(rows.map((r) => r.key)), onList = new Set(listed.map((r) => r.k));
  const isNew = (p: SentProduct) => !have.has(`woo:${p.id}`) && !(p.variations ?? []).some((v) => have.has(`woo:${p.id}:${v.id}`));
  const mains = sent.filter((p) => !p.main);
  const proposals = await propose(mains.filter(isNew));

  const upsert = (key: string, name: string, mainKey: string | null, type: ProductType | null, pieces: number) => query(
    `INSERT INTO catalogue_items (place_id, key, name, main_key, proposed_type, proposed_pieces, state) VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (place_id, key) DO UPDATE SET name=EXCLUDED.name, main_key=EXCLUDED.main_key, updated_at=now()`,
    [placeId, key, name, mainKey, type, pieces, onList.has(key) ? "added" : "open"],
  );
  for (const p of sent) {
    if (p.main) { await upsert(`woo:${p.id}`, p.name, `woo:${p.main}`, null, 1); continue; } // a translation: it follows its main product
    const split0 = (p.variations ?? []).filter((v) => have.has(`woo:${p.id}:${v.id}`));
    if (split0.length) { // already here as one row per variation: only the names are refreshed, new variations wait for a new proposal
      for (const v of split0) await query("UPDATE catalogue_items SET name=$3, updated_at=now() WHERE place_id=$1 AND key=$2", [placeId, `woo:${p.id}:${v.id}`, `${p.name} - ${v.label}`.slice(0, PRODUCT_NAME_MAX)]);
      continue;
    }
    const pr = proposals.get(p.id) ?? { type: null, pieces: 1, perVariation: null };
    const split = pr.perVariation && p.variations && new Set(pr.perVariation).size > 1;
    if (split) for (const [i, v] of p.variations!.entries()) await upsert(`woo:${p.id}:${v.id}`, `${p.name} - ${v.label}`.slice(0, PRODUCT_NAME_MAX), null, pr.type, pr.perVariation![i] ?? 1);
    else await upsert(`woo:${p.id}`, p.name, null, pr.type, pr.pieces);
  }
  const [{ n }] = await query<{ n: number }>("SELECT COUNT(*)::int n FROM catalogue_items WHERE place_id=$1 AND state='open' AND main_key IS NULL", [placeId]);
  return { received: sent.length, open: n };
}

const categoryOf = (t: ProductType): ProductCategory => PRODUCT_CATEGORIES.find((c) => asksType(c) && TYPES_BY_CATEGORY[c].includes(t)) ?? (t === "refill" ? "bulk_refill" : "food_glass_paper_metal");

/**
 * The owner's decision on catalogue rows: `add` puts them on the shop's list with the kind and pieces the owner settled on (the shop
 * system's number and the names of its translations become other names of the product); `skip` drops them from the review.
 */
export async function decideCatalogue(placeId: string, b: { packaging?: unknown; add?: unknown; skip?: unknown }): Promise<{ added: number; problems: string[] }> {
  const report = { added: 0, problems: [] as string[] };
  const skip = (Array.isArray(b.skip) ? b.skip : []).map(Number).filter(Number.isInteger);
  if (skip.length) await query("UPDATE catalogue_items SET state='skipped', updated_at=now() WHERE place_id=$1 AND id = ANY($2) AND state='open'", [placeId, skip]);
  const add = Array.isArray(b.add) ? (b.add as { id?: unknown; type?: unknown; pieces?: unknown }[]) : [];
  if (!add.length) return report;
  if (!isPackaging(b.packaging)) throw new ProductError("Say how these products are packed.");
  for (const a of add) {
    const [item] = await query<{ id: number; key: string; name: string }>("SELECT id, key, name FROM catalogue_items WHERE place_id=$1 AND id=$2 AND state='open'", [placeId, Number(a.id)]);
    if (!item) continue;
    try {
      if (!isType(a.type)) throw new ProductError("Pick what kind of product it is.");
      const pieces = Number(a.pieces ?? 1);
      if (!Number.isInteger(pieces) || pieces < 1 || pieces > MAX_PIECES) throw new ProductError(`Pieces in the pack is a whole number from 1 to ${MAX_PIECES}.`);
      const category = categoryOf(a.type);
      await addProduct(placeId, { receiptName: item.name, category, packagingType: b.packaging, productType: a.type, pieces });
      const [product] = await query<{ id: string }>("SELECT id FROM products WHERE place_id=$1 AND lower(receipt_name)=lower($2)", [placeId, item.name]);
      await addAlias(placeId, product.id, item.key);
      // Its translations: their numbers and names find the same product. Only for a product listed as a whole, not per variation.
      const twins = item.key.split(":").length === 2 ? await query<{ key: string; name: string }>("SELECT key, name FROM catalogue_items WHERE place_id=$1 AND main_key=$2", [placeId, item.key]) : [];
      for (const t of twins) for (const alias of [t.key, t.name]) await addAlias(placeId, product.id, alias).catch((e) => { if (!(e instanceof ProductError)) throw e; });
      await query("UPDATE catalogue_items SET state='added', updated_at=now() WHERE place_id=$1 AND (id=$2 OR main_key=$3)", [placeId, item.id, item.key]);
      report.added++;
    } catch (e) { if (!(e instanceof ProductError)) throw e; report.problems.push(`${item.name}: ${e.message}`); }
  }
  return report;
}

const MODEL = process.env.CATEGORY_MODEL ?? "claude-sonnet-5-5";

/** The AI's reading of each product's name: which kind of the impact table it is (or none), and how many pieces a pack holds, per
 *  variation when the variations are pack sizes. A proposal the owner checks; without an API key every product arrives undecided. */
async function propose(products: SentProduct[]): Promise<Map<number, Proposal>> {
  const out = new Map<number, Proposal>();
  if (!products.length || !process.env.ANTHROPIC_API_KEY) return out;
  const types = PRODUCT_TYPES.filter((t) => t !== "other");
  for (let at = 0; at < products.length; at += 60) {
    const batch = products.slice(at, at + 60);
    try {
      const res = await new Anthropic().messages.create({
        model: MODEL,
        max_tokens: 8000,
        output_config: {
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              properties: {
                products: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      index: { type: "integer" }, type: { type: "string", enum: [...types, "other", "not_eco"] }, pieces: { type: "integer" },
                      variation_pieces: { type: "array", items: { type: "integer" } },
                    },
                    required: ["index", "type", "pieces", "variation_pieces"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["products"],
              additionalProperties: false,
            },
          },
        },
        messages: [{
          role: "user",
          content: `These are products from an eco shop's catalogue. For each, say which plastic-free product type it is and how many pieces one pack holds.

Types:
${types.map((t) => `- ${t}: ${TYPE_LABELS[t].label} (${TYPE_LABELS[t].examples})`).join("\n")}
- other: plastic-free, but none of the types above.
- not_eco: not a plastic-free product, or the name doesn't tell (services, gift cards, raw material, bundles of different products).

pieces: how many of that thing one pack holds, from the name ("Set of 3" = 3, "Pack of 4 straws" = 1 set, a single item = 1; a
toothbrush 5-pack = 5). When unsure, 1.
variation_pieces: when the product has variations that are different pack sizes ("5 Pack", "9 Pack", "Single"), the pieces for each
variation in the order given; otherwise an empty list (colours, designs and scents are not pack sizes).

${batch.map((p, i) => `${i}. ${p.name}${p.variations ? ` [variations: ${p.variations.map((v) => v.label).join(" | ")}]` : ""}`).join("\n")}`,
        }],
      });
      const block = res.content.find((b) => b.type === "text");
      const j = JSON.parse(block && "text" in block ? block.text : "{}") as { products?: { index: number; type: string; pieces: number; variation_pieces: number[] }[] };
      const bound = (n: unknown) => Math.min(MAX_PIECES, Math.max(1, Math.round(Number(n)) || 1));
      for (const r of j.products ?? []) {
        const p = batch[r.index];
        if (!p) continue;
        const per = p.variations && r.variation_pieces?.length === p.variations.length ? r.variation_pieces.map(bound) : null;
        out.set(p.id, { type: isType(r.type) ? r.type : null, pieces: bound(r.pieces), perVariation: per });
      }
    } catch (e) { console.error("catalogue proposal failed", e); }
  }
  return out;
}
