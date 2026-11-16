import { randomBytes } from "node:crypto";
import { query } from "./db";
import { unmatchedLines } from "./match";
import { MAX_PHOTO_BYTES } from "./photoRules";
import { isJpeg } from "./placePhotos";
import {
  isCategory, isPackaging, MAX_ALIASES, MAX_PARTS, MAX_PIECES, MAX_PRODUCTS, PRODUCT_NAME_MAX, typeOf, type Product, type ProductCategory, type ProductSetupState,
} from "./productRules";

// An eco shop's plastic-free products and their setup (docs/eco-product-standard.md): the owner declares, ticks categories, lists
// products by their receipt name, and answers the refill question. Products never carry impact numbers (impact_factors has them).

export class ProductError extends Error { constructor(message: string, public status = 400) { super(message); } }

const clean = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const photoUrl = (placeId: string, productId: string, v: string) => `/api/places/${placeId}/products/${productId}/photo?v=${v}`;

type Row = { id: string; receipt_name: string; display_name: string; category: string; packaging_type: string; product_type: string; pieces: number; replaces: string | null; photo_url: string | null; source: string; status: string };
const toProduct = (r: Row, aliases: string[] = [], parts: Product["parts"] = []): Product => ({
  aliases, parts,
  id: r.id, receiptName: r.receipt_name, displayName: r.display_name, category: r.category as Product["category"], packagingType: r.packaging_type as Product["packagingType"],
  productType: r.product_type as Product["productType"], pieces: r.pieces,
  replaces: r.replaces, photoUrl: r.photo_url, source: r.source as Product["source"], status: r.status as Product["status"],
});

/** Each product's other printed names. */
async function aliasesOf(placeId: string): Promise<Map<string, string[]>> {
  const rows = await query<{ product_id: string; receipt_name_variant: string }>(
    "SELECT a.product_id, a.receipt_name_variant FROM product_aliases a JOIN products p ON p.id = a.product_id WHERE p.place_id=$1 ORDER BY a.id", [placeId],
  );
  const out = new Map<string, string[]>();
  for (const r of rows) out.set(r.product_id, [...(out.get(r.product_id) ?? []), r.receipt_name_variant]);
  return out;
}

/** Whether a name is already taken at this shop, as a product's receipt name or as an alias: one printed name, one product. */
async function nameTaken(placeId: string, name: string): Promise<"removed" | "taken" | null> {
  const rows = await query<{ status: string }>(
    `SELECT status FROM products WHERE place_id=$1 AND lower(receipt_name)=lower($2)
     UNION ALL SELECT p.status FROM product_aliases a JOIN products p ON p.id = a.product_id WHERE p.place_id=$1 AND lower(a.receipt_name_variant)=lower($2)`,
    [placeId, name],
  );
  return !rows.length ? null : rows.some((r) => r.status === "removed") ? "removed" : "taken";
}

/** Receipt and order lines already seen with this wording stop waiting in the owner's queue: they are this product. */
const claimLines = (placeId: string, productId: string, name: string) =>
  query("UPDATE receipt_lines SET matched_product_id=$2, confidence=1 WHERE place_id=$1 AND matched_product_id IS NULL AND lower(btrim(raw_text))=lower($3)", [placeId, productId, name]);

/** Everything the setup wizard and the dashboard show. */
export async function productSetup(placeId: string, role: "owner" | "staff"): Promise<ProductSetupState> {
  const [[place], products, queue, sample, factors, aliases, parts, catalogue] = await Promise.all([
    query<{ product_categories: string[]; refill: boolean | null; products_declared_at: string | null; in_store: boolean }>(
      "SELECT product_categories, refill, products_declared_at::text, (lat IS NOT NULL) AS in_store FROM stamp_places WHERE id=$1", [placeId],
    ),
    query<Row>("SELECT * FROM products WHERE place_id=$1 ORDER BY category, lower(display_name)", [placeId]),
    unmatchedLines(placeId),
    query("SELECT 1 FROM receipt_samples WHERE place_id=$1", [placeId]),
    query<{ product_type: string; plastic_g: number; co2_g: number }>("SELECT product_type, plastic_g, co2_g FROM impact_factors"),
    aliasesOf(placeId),
    query<{ product_id: string; part_id: string; name: string; count: number }>(
      "SELECT pp.product_id, pp.part_id, part.receipt_name AS name, pp.count FROM product_parts pp JOIN products part ON part.id = pp.part_id WHERE part.place_id=$1 AND part.status <> 'removed' ORDER BY lower(part.receipt_name)", [placeId],
    ),
    // What the shop's plugin sent and the owner hasn't decided yet (lib/catalogue.ts; read here because that file builds on this one).
    query<{ id: number; key: string; name: string; proposed_type: string | null; proposed_pieces: number }>(
      "SELECT id, key, name, proposed_type, proposed_pieces FROM catalogue_items WHERE place_id=$1 AND state='open' AND main_key IS NULL ORDER BY (proposed_type IS NULL), lower(name) LIMIT 300", [placeId],
    ),
  ]);
  return {
    role,
    setup: { categories: (place?.product_categories ?? []).filter(isCategory), refill: place?.refill ?? null, declaredAt: place?.products_declared_at ?? null, hasSample: sample.length > 0, inStore: !!place?.in_store },
    products: products.map((p) => toProduct(p, aliases.get(p.id), parts.filter((x) => x.product_id === p.id).map((x) => ({ id: x.part_id, name: x.name, count: x.count })))),
    factors: Object.fromEntries(factors.map((f) => [f.product_type, { plasticG: f.plastic_g, co2G: f.co2_g }])),
    // No customer photo path yet: a queued line has no photo until the app asks the scanner for one.
    queue: queue.map((q) => ({ ...q, photoUrl: null })),
    catalogue: catalogue.map((c) => ({ id: c.id, key: c.key, name: c.name, type: (c.proposed_type as Product["productType"] | null), pieces: c.proposed_pieces })),
  };
}

/** Saves the parts of the setup that were sent. The declaration can be made, never withdrawn. */
export async function saveSetup(placeId: string, b: { categories?: unknown; refill?: unknown; declared?: unknown }): Promise<void> {
  if (b.categories !== undefined) {
    if (!Array.isArray(b.categories) || !b.categories.every(isCategory)) throw new ProductError("Unknown category.");
    await query("UPDATE stamp_places SET product_categories=$2 WHERE id=$1", [placeId, [...new Set(b.categories as ProductCategory[])]]);
  }
  if (b.refill !== undefined) {
    if (typeof b.refill !== "boolean") throw new ProductError("Refill is yes or no.");
    await query("UPDATE stamp_places SET refill=$2 WHERE id=$1", [placeId, b.refill]);
  }
  if (b.declared === true) await query("UPDATE stamp_places SET products_declared_at = COALESCE(products_declared_at, now()) WHERE id=$1", [placeId]);
}

/** How many of the thing are in one pack: a whole number from 1 to MAX_PIECES. */
function piecesOf(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > MAX_PIECES) throw new ProductError(`Pieces in the pack is a whole number from 1 to ${MAX_PIECES}.`);
  return n;
}

/** Changes what kind of product it is, or how many pieces are in the pack: { productType?, pieces? }. Still no numbers: the figure
 *  belongs to the type. */
export async function updateProduct(placeId: string, id: string, b: Record<string, unknown>): Promise<void> {
  const [p] = await query<Row>("SELECT * FROM products WHERE place_id=$1 AND id=$2", [placeId, id]);
  if (!p) throw new ProductError("Unknown product.", 404);
  if (p.status === "removed") throw new ProductError("This product was removed from the eco list after confirmed reports.", 409);
  const productType = b.productType === undefined ? p.product_type : typeOf(p.category as Product["category"], p.packaging_type as Product["packagingType"], b.productType);
  if (!productType) throw new ProductError("Pick what kind of product it is.");
  await query("UPDATE products SET product_type=$3, pieces=$4 WHERE place_id=$1 AND id=$2", [placeId, id, productType, b.pieces === undefined ? p.pieces : piecesOf(b.pieces)]);
}

/** Adds a product to the shop's list. `fromQueue`: the owner confirmed a line customers scanned. Receipt lines already scanned with this
 *  name stop waiting in the queue. */
export async function addProduct(placeId: string, b: Record<string, unknown>): Promise<void> {
  const receiptName = clean(b.receiptName, PRODUCT_NAME_MAX);
  const displayName = clean(b.displayName, PRODUCT_NAME_MAX) || receiptName;
  const replaces = clean(b.replaces, PRODUCT_NAME_MAX) || null;
  if (receiptName.length < 2) throw new ProductError("Enter the product's name exactly as your receipt prints it.");
  if (!isCategory(b.category)) throw new ProductError("Pick a category.");
  if (!isPackaging(b.packagingType)) throw new ProductError("Pick how it is packed.");
  const productType = typeOf(b.category, b.packagingType, b.productType);
  if (!productType) throw new ProductError("Pick what kind of product it is.");
  const pieces = piecesOf(b.pieces ?? 1);
  const [place] = await query<{ products_declared_at: string | null; n: number }>(
    "SELECT products_declared_at, (SELECT COUNT(*)::int FROM products WHERE place_id=$1) AS n FROM stamp_places WHERE id=$1", [placeId],
  );
  if (!place?.products_declared_at) throw new ProductError("Confirm the declaration first: the products you list are sold without plastic packaging.");
  if (place.n >= MAX_PRODUCTS) throw new ProductError(`A shop can list ${MAX_PRODUCTS} products for now.`);
  const taken = await nameTaken(placeId, receiptName);
  if (taken) throw new ProductError(taken === "removed" ? "This product was removed from the eco list after confirmed reports, so it can't be added again." : "That name is already on your list.", 409);
  const id = randomBytes(9).toString("base64url");
  await query(
    "INSERT INTO products (id, place_id, receipt_name, display_name, category, packaging_type, product_type, pieces, replaces, source, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'owner',$10)",
    [id, placeId, receiptName, displayName, b.category, b.packagingType, productType, pieces, replaces, b.fromQueue === true ? "confirmed" : "declared"],
  );
  await claimLines(placeId, id, receiptName);
}

/** Another printed name for a product the shop already lists: the Thai name next to the English one, the till's short name, an old
 *  name. Lines with that wording then count as this product, and one that waited in the queue leaves it. */
export async function addAlias(placeId: string, productId: string, raw: unknown): Promise<void> {
  const name = clean(raw, PRODUCT_NAME_MAX);
  if (name.length < 2) throw new ProductError("Enter the other name as it is printed.");
  const [product] = await query<{ status: string; n: number }>(
    "SELECT status, (SELECT COUNT(*)::int FROM product_aliases WHERE product_id=$2) AS n FROM products WHERE place_id=$1 AND id=$2", [placeId, productId],
  );
  if (!product) throw new ProductError("Unknown product.", 404);
  if (product.status === "removed") throw new ProductError("This product was removed from the eco list after confirmed reports.", 409);
  if (product.n >= MAX_ALIASES) throw new ProductError(`A product can have ${MAX_ALIASES} other names.`);
  const taken = await nameTaken(placeId, name);
  if (taken) throw new ProductError(taken === "removed" ? "That name belongs to a product that was removed after confirmed reports." : "That name is already on your list.", 409);
  await query("INSERT INTO product_aliases (product_id, receipt_name_variant) VALUES ($1,$2)", [productId, name]);
  await claimLines(placeId, productId, name);
}

/** A bundle's contents: `count` of another product on the list (0 takes it out). Bundles don't nest: a part has no parts of its own,
 *  and a product that is a part of something can't become a bundle. */
export async function setPart(placeId: string, productId: string, partId: unknown, rawCount: unknown): Promise<void> {
  const count = Number(rawCount);
  if (typeof partId !== "string" || !partId || partId === productId) throw new ProductError("Pick another product from your list.");
  if (!Number.isInteger(count) || count < 0 || count > MAX_PIECES) throw new ProductError(`How many is a whole number from 1 to ${MAX_PIECES}.`);
  if (count === 0) { await query("DELETE FROM product_parts pp USING products p WHERE p.id = pp.product_id AND p.place_id=$1 AND pp.product_id=$2 AND pp.part_id=$3", [placeId, productId, partId]); return; }
  const both = await query<{ id: string; status: string; has_parts: boolean; is_part: boolean; n: number }>(
    `SELECT id, status, EXISTS (SELECT 1 FROM product_parts WHERE product_id = p.id) AS has_parts, EXISTS (SELECT 1 FROM product_parts WHERE part_id = p.id) AS is_part,
            (SELECT COUNT(*)::int FROM product_parts WHERE product_id = p.id) AS n
     FROM products p WHERE place_id=$1 AND id = ANY($2)`, [placeId, [productId, partId]],
  );
  const bundle = both.find((p) => p.id === productId), part = both.find((p) => p.id === partId);
  if (!bundle || !part) throw new ProductError("Unknown product.", 404);
  if (bundle.status === "removed" || part.status === "removed") throw new ProductError("A product that was removed after confirmed reports can't be in a bundle.", 409);
  if (bundle.is_part) throw new ProductError("This product is part of a bundle itself, so it can't be a bundle.");
  if (part.has_parts) throw new ProductError("A bundle can't contain another bundle. Add that bundle's products instead.");
  if (bundle.n >= MAX_PARTS) throw new ProductError(`A bundle can have ${MAX_PARTS} different products.`);
  await query("INSERT INTO product_parts (product_id, part_id, count) VALUES ($1,$2,$3) ON CONFLICT (product_id, part_id) DO UPDATE SET count=EXCLUDED.count", [productId, partId, count]);
}

export async function removeAlias(placeId: string, productId: string, name: string): Promise<void> {
  await query("DELETE FROM product_aliases a USING products p WHERE p.id = a.product_id AND p.place_id=$1 AND a.product_id=$2 AND a.receipt_name_variant=$3", [placeId, productId, name]);
}

/** Takes a product off the list. One with a confirmed report against it stays, so deleting and re-adding can't clear the report. */
export async function removeProduct(placeId: string, id: string): Promise<void> {
  const gone = await query("DELETE FROM products WHERE place_id=$1 AND id=$2 AND status IN ('declared','confirmed') RETURNING id", [placeId, id]);
  if (!gone.length && (await query("SELECT 1 FROM products WHERE place_id=$1 AND id=$2", [placeId, id])).length) {
    throw new ProductError("This product has a confirmed report, so it stays on record.", 409);
  }
}

function checkPhoto(bytes: Buffer) {
  if (!isJpeg(bytes)) throw new ProductError("That isn't a photo we can use. Try a JPEG, PNG or WebP.");
  if (bytes.length > MAX_PHOTO_BYTES) throw new ProductError("That photo is too large.", 413);
}

export async function setProductPhoto(placeId: string, id: string, bytes: Buffer): Promise<void> {
  checkPhoto(bytes);
  const set = await query("UPDATE products SET photo_url=$3 WHERE place_id=$1 AND id=$2 RETURNING id", [placeId, id, photoUrl(placeId, id, randomBytes(4).toString("hex"))]);
  if (!set.length) throw new ProductError("Unknown product.", 404);
  await query("INSERT INTO product_photos (product_id, bytes) VALUES ($1,$2) ON CONFLICT (product_id) DO UPDATE SET bytes=EXCLUDED.bytes", [id, bytes]);
}

export async function productPhoto(placeId: string, id: string): Promise<Buffer | null> {
  return (await query<{ bytes: Buffer }>("SELECT ph.bytes FROM product_photos ph JOIN products p ON p.id = ph.product_id WHERE p.place_id=$1 AND p.id=$2", [placeId, id]))[0]?.bytes ?? null;
}

/** The shop's sample receipt; a new one replaces the old. */
export async function saveSample(placeId: string, bytes: Buffer): Promise<void> {
  checkPhoto(bytes);
  await query("INSERT INTO receipt_samples (place_id, bytes) VALUES ($1,$2) ON CONFLICT (place_id) DO UPDATE SET bytes=EXCLUDED.bytes, created_at=now()", [placeId, bytes]);
}

/** "Not plastic-free": this wording leaves the owner's queue and stays out. */
export async function dismissLine(placeId: string, rawText: string): Promise<void> {
  await query("UPDATE receipt_lines SET dismissed=true WHERE place_id=$1 AND matched_product_id IS NULL AND lower(btrim(raw_text))=lower(btrim($2))", [placeId, rawText]);
}

/** What visitors see on the shop's page: its eco list (removed products are gone), and whether it refills. */
export async function publicProducts(placeId: string): Promise<{ refill: boolean | null; products: Product[] }> {
  const [[place], rows] = await Promise.all([
    query<{ refill: boolean | null }>("SELECT refill FROM stamp_places WHERE id=$1", [placeId]),
    query<Row>("SELECT * FROM products WHERE place_id=$1 AND status <> 'removed' ORDER BY category, lower(display_name)", [placeId]),
  ]);
  return { refill: place?.refill ?? null, products: rows.map((r) => toProduct(r)) };
}

export type PublicImpact = {
  /** The name on receipts and orders, and the other names the same product is printed with. */
  name: string; aliases: string[]; type: Product["productType"]; pieces: number;
  /** What one unit bought counts, in grams: the type's figure times the pieces, or for a bundle the sum of its parts. 0 = no figure yet. */
  plasticG: number; co2G: number; bundle: boolean;
};

/** A shop's eco list with what each product counts, for the shop's own site to show EcoProof AI's numbers (not a copy of them). */
export async function publicImpacts(placeId: string): Promise<PublicImpact[]> {
  const [rows, aliases, parts, factors] = await Promise.all([
    query<Row>("SELECT * FROM products WHERE place_id=$1 AND status <> 'removed' ORDER BY lower(receipt_name)", [placeId]),
    aliasesOf(placeId),
    query<{ product_id: string; part_id: string; count: number }>("SELECT pp.product_id, pp.part_id, pp.count FROM product_parts pp JOIN products p ON p.id = pp.product_id WHERE p.place_id=$1", [placeId]),
    query<{ product_type: string; plastic_g: number; co2_g: number }>("SELECT product_type, plastic_g, co2_g FROM impact_factors"),
  ]);
  const f = new Map(factors.map((x) => [x.product_type, x]));
  const own = (r: Row, n = 1) => { const x = f.get(r.product_type); return x ? { plasticG: x.plastic_g * r.pieces * n, co2G: x.co2_g * r.pieces * n } : { plasticG: 0, co2G: 0 }; };
  return rows.map((r) => {
    const mine = parts.filter((x) => x.product_id === r.id);
    const sum = mine.length
      ? mine.reduce((t, x) => { const part = rows.find((o) => o.id === x.part_id); const v = part ? own(part, x.count) : { plasticG: 0, co2G: 0 }; return { plasticG: t.plasticG + v.plasticG, co2G: t.co2G + v.co2G }; }, { plasticG: 0, co2G: 0 })
      : own(r);
    return { name: r.receipt_name, aliases: aliases.get(r.id) ?? [], type: r.product_type as Product["productType"], pieces: r.pieces, ...sum, bundle: mine.length > 0 };
  });
}

export type ImportRow = { name?: unknown; category?: unknown; packaging?: unknown; type?: unknown; pieces?: unknown; replaces?: unknown; aliases?: unknown; parts?: unknown };

/**
 * Adds a prepared list in one go: [{ name, category, packaging, type?, pieces?, aliases?: string[], parts?: [{ name, count }] }].
 * The same rules as adding by hand, one product at a time (still no numbers). A name already on the list is kept as it is and only
 * gets its missing aliases and parts, so a list can be imported again after it grew. Says what happened per line.
 */
export async function importProducts(placeId: string, rows: unknown): Promise<{ added: number; kept: number; problems: string[] }> {
  if (!Array.isArray(rows) || !rows.length || rows.length > MAX_PRODUCTS) throw new ProductError(`Send a list of 1 to ${MAX_PRODUCTS} products.`);
  const report = { added: 0, kept: 0, problems: [] as string[] };
  const idOf = async (name: string) => (await query<{ id: string }>("SELECT id FROM products WHERE place_id=$1 AND lower(receipt_name)=lower($2)", [placeId, name]))[0]?.id;
  const list = rows as ImportRow[];
  for (const r of list) { // products and their other names first, bundles after: a bundle's parts must exist
    const name = clean(r.name, PRODUCT_NAME_MAX);
    try {
      let id = await idOf(name);
      if (id) report.kept++;
      else { await addProduct(placeId, { receiptName: name, category: r.category, packagingType: r.packaging, productType: r.type, pieces: r.pieces ?? 1, replaces: r.replaces }); id = (await idOf(name))!; report.added++; }
      const have = (await aliasesOf(placeId)).get(id) ?? [];
      for (const a of Array.isArray(r.aliases) ? r.aliases : []) {
        const alias = clean(a, PRODUCT_NAME_MAX);
        if (alias && !have.some((h) => h.toLowerCase() === alias.toLowerCase())) await addAlias(placeId, id, alias);
      }
    } catch (e) { if (!(e instanceof ProductError)) throw e; report.problems.push(`${name || "(no name)"}: ${e.message}`); }
  }
  for (const r of list) {
    const name = clean(r.name, PRODUCT_NAME_MAX);
    for (const p of Array.isArray(r.parts) ? (r.parts as { name?: unknown; count?: unknown }[]) : []) {
      try {
        const [id, partId] = [await idOf(name), await idOf(clean(p?.name, PRODUCT_NAME_MAX))];
        if (!id || !partId) throw new ProductError(`"${clean(p?.name, PRODUCT_NAME_MAX)}" is not on the list.`);
        await setPart(placeId, id, partId, p?.count ?? 1);
      } catch (e) { if (!(e instanceof ProductError)) throw e; report.problems.push(`${name}: ${e.message}`); }
    }
  }
  return report;
}
