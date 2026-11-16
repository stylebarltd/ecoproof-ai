import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { query } from "./db";
import type { LineItem } from "./impact";
import { matchLines } from "./match";
import { asksType, isType, PRODUCT_CATEGORIES, PRODUCT_TYPES, TYPE_LABELS, TYPES_BY_CATEGORY, type ProductCategory, type ProductType } from "./productRules";

/**
 * The single entry point to the proof loop. Deliberately small: no prices, no customer personal data.
 * A line is its name and quantity; `category` and `productId` are accepted from older senders and ignored.
 */
export type OrderItem = { name: string; quantity: number; category?: string; productId?: number };
export type Order = { brandId: string; orderId: string; items: OrderItem[] };

export function parseOrder(raw: unknown): Order {
  const o = raw as Partial<Order> | null;
  const bad = (m: string) => { throw new OrderError(m); };
  if (!o || typeof o !== "object") bad("order must be an object");
  const brandId = String(o!.brandId ?? "").trim().toLowerCase();
  const orderId = String(o!.orderId ?? "").trim();
  if (!/^[a-z0-9-]{1,40}$/.test(brandId)) bad("brandId required (letters, digits, dashes)");
  if (!orderId || orderId.length > 80) bad("orderId required (max 80 chars)");
  if (!Array.isArray(o!.items) || !o!.items.length || o!.items.length > 100) bad("items must be a non-empty array (max 100)");
  const items = o!.items!.map((i) => {
    const name = String(i?.name ?? "").trim().slice(0, 200);
    const quantity = Math.round(Number(i?.quantity));
    if (!name) bad("every item needs a name");
    if (!(quantity >= 1 && quantity <= 1000)) bad(`item "${name}": quantity must be 1–1000`);
    return { name, quantity, category: i?.category ? String(i.category) : undefined, productId: Number.isInteger(Number(i?.productId)) && Number(i?.productId) > 0 ? Number(i?.productId) : undefined };
  });
  return { brandId, orderId, items };
}

export class OrderError extends Error {}

/** Stable identity of one order. Used for the database unique index and the on-chain claim account, so an order is proven once. */
export const orderFingerprint = (brandId: string, orderId: string) =>
  createHash("sha256").update(`ecoproof:order:v1:${brandId}:${orderId}`).digest("hex");

// ---- Line -> impact ---------------------------------------------------------------------------------------------------------------

export type Matched = LineItem & { source: "product" | "ai" | "none" };

const NOTHING = { category: "not_sustainable", plasticG: 0, co2G: 0 } as const;

/** EcoProof AI's factor table: grams of plastic and CO2 avoided per piece, by product type. */
export async function factors(): Promise<Map<string, { plasticG: number; co2G: number }>> {
  const rows = await query<{ product_type: string; plastic_g: number; co2_g: number }>("SELECT product_type, plastic_g, co2_g FROM impact_factors");
  return new Map(rows.map((r) => [r.product_type, { plasticG: r.plastic_g, co2G: r.co2_g }]));
}

/**
 * What each line of an order or a receipt is worth at this shop (docs/eco-product-standard.md). A line that is one of the shop's declared
 * products gets the factor of that product's type, once per piece in the pack. A line the shop hasn't listed is estimated: the AI reads
 * the type off the name, the same table gives the numbers, and it counts as one piece (shown as an estimate until the owner confirms it
 * from the queue). A removed product or a line the owner dismissed counts nothing. Nobody's own numbers are used anywhere.
 */
export async function matchItems(order: Order): Promise<Matched[]> {
  const [lines, table] = await Promise.all([matchLines(order.brandId, order.items.map((i) => i.name)), factors()]);
  const unknown = order.items.filter((_, i) => lines[i].kind === "unknown").map((i) => i.name);
  const guesses = await classify([...new Set(unknown)]);
  return order.items.map((it, i): Matched => {
    const base = { name: it.name, quantity: it.quantity };
    const m = lines[i];
    if (m.kind === "blocked") return { ...base, ...NOTHING, confidence: 1, source: "none" };
    if (m.kind === "product") {
      const { category, packagingType, productType, pieces, parts } = m.product;
      const own = { productId: m.productId, impactSource: "shop" as const, source: "product" as const, confidence: m.confidence };
      if (parts) { // a bundle: the sum of what it contains
        const sum = parts.reduce((t, x) => { const f = table.get(x.productType); return f ? { plasticG: t.plasticG + f.plasticG * x.pieces * x.count, co2G: t.co2G + f.co2G * x.pieces * x.count } : t; }, { plasticG: 0, co2G: 0 });
        return sum.plasticG > 0 || sum.co2G > 0 ? { ...base, category, packagingType, ...sum, ...own } : { ...base, ...NOTHING, ...own };
      }
      const f = table.get(productType);
      if (!f) return { ...base, ...NOTHING, ...own }; // listed, but its type has no figure yet
      return { ...base, category, packagingType, productType, pieces, plasticG: f.plasticG * pieces, co2G: f.co2G * pieces, ...own };
    }
    const guess = guesses.get(it.name);
    const f = guess && table.get(guess.productType);
    if (!guess || !f) return { ...base, ...NOTHING, confidence: guess?.confidence ?? 0, source: "none" };
    return { ...base, category: guess.category, productType: guess.productType, pieces: 1, ...f, confidence: guess.confidence, source: "ai", impactSource: "ai" };
  });
}

const MODEL = process.env.CATEGORY_MODEL ?? "claude-sonnet-5-5";

type Guess = { category: ProductCategory; productType: ProductType; confidence: number };

/** The category a type is listed under, for the line's label. */
const categoryOf = (t: ProductType): ProductCategory => PRODUCT_CATEGORIES.find((c) => asksType(c) && TYPES_BY_CATEGORY[c].includes(t)) ?? (t === "refill" ? "bulk_refill" : "food_glass_paper_metal");

/** The estimate for lines a shop hasn't listed: the AI says, from the name alone, whether the product is plastic-free and which type
 *  of the impact table it is. Names it isn't sure about, or that fit no type, are left out and count nothing. */
async function classify(names: string[]): Promise<Map<string, Guess>> {
  const out = new Map<string, Guess>();
  if (!names.length || !process.env.ANTHROPIC_API_KEY) return out;
  const types = PRODUCT_TYPES.filter((t) => t !== "other");
  try {
    const res = await new Anthropic().messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              lines: {
                type: "array",
                items: {
                  type: "object",
                  properties: { index: { type: "integer" }, type: { type: "string", enum: [...types, "not_eco"] }, confidence: { type: "number" } },
                  required: ["index", "type", "confidence"],
                  additionalProperties: false,
                },
              },
            },
            required: ["lines"],
            additionalProperties: false,
          },
        },
      },
      messages: [{
        role: "user",
        content: `These are product lines from an eco shop's receipt or order. For each, decide whether it clearly is one of these plastic-free product types:

${types.map((t) => `- ${t}: ${TYPE_LABELS[t].label} (${TYPE_LABELS[t].examples})`).join("\n")}
- not_eco: anything else, anything that fits none of the types, or when the name doesn't tell (shipping, gift cards, services, ordinary packaged goods, bundles of different products).
Use "not_eco" unless the name clearly says it. confidence is 0 to 1.

${names.map((n, i) => `${i}. ${n}`).join("\n")}`,
      }],
    });
    const block = res.content.find((b) => b.type === "text");
    const j = JSON.parse(block && "text" in block ? block.text : "{}") as { lines?: { index: number; type: string; confidence: number }[] };
    for (const l of j.lines ?? []) {
      const name = names[l.index];
      if (name && isType(l.type) && l.type !== "other") out.set(name, { category: categoryOf(l.type), productType: l.type, confidence: Math.max(0, Math.min(1, Number(l.confidence) || 0)) });
    }
  } catch (e) { console.error("line classification failed", e); }
  return out;
}
