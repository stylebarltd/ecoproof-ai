import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { query } from "./db";
import type { LineItem } from "./impact";
import { matchLines } from "./match";
import { CATEGORY_LABELS, isCategory, isPackaging, PACKAGING_LABELS, PACKAGING_TYPES, PRODUCT_CATEGORIES, type PackagingType, type ProductCategory } from "./productRules";

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

/** EcoProof AI's factor table: grams of plastic and CO2 avoided per purchase, by category and packaging. */
async function factors(): Promise<Map<string, { plasticG: number; co2G: number }>> {
  const rows = await query<{ category: string; packaging_type: string; plastic_g: number; co2_g: number }>("SELECT category, packaging_type, plastic_g, co2_g FROM impact_factors");
  return new Map(rows.map((r) => [`${r.category}/${r.packaging_type}`, { plasticG: r.plastic_g, co2G: r.co2_g }]));
}

/**
 * What each line of an order or a receipt is worth at this shop (docs/eco-product-standard.md). A line that is one of the shop's declared
 * products gets the factor for that product's category and packaging. A line the shop hasn't listed is estimated: the AI reads category
 * and packaging off the name, and the same table gives the numbers (shown as an estimate until the owner confirms it from the queue).
 * A removed product or a line the owner dismissed counts nothing. Nobody's own numbers are used anywhere.
 */
export async function matchItems(order: Order): Promise<Matched[]> {
  const [lines, table] = await Promise.all([matchLines(order.brandId, order.items.map((i) => i.name)), factors()]);
  const unknown = order.items.filter((_, i) => lines[i].kind === "unknown").map((i) => i.name);
  const guesses = await classify([...new Set(unknown)]);
  return order.items.map((it, i) => {
    const base = { name: it.name, quantity: it.quantity };
    const m = lines[i];
    if (m.kind === "blocked") return { ...base, ...NOTHING, confidence: 1, source: "none" };
    const kind = m.kind === "product" ? { ...m.product, confidence: m.confidence } : guesses.get(it.name);
    const f = kind && table.get(`${kind.category}/${kind.packagingType}`);
    if (!kind || !f) return { ...base, ...NOTHING, confidence: kind?.confidence ?? 0, source: m.kind === "product" ? "product" : "none", ...(m.kind === "product" ? { productId: m.productId, impactSource: "shop" as const } : {}) };
    return m.kind === "product"
      ? { ...base, category: kind.category, packagingType: kind.packagingType, ...f, confidence: kind.confidence, source: "product", productId: m.productId, impactSource: "shop" }
      : { ...base, category: kind.category, packagingType: kind.packagingType, ...f, confidence: kind.confidence, source: "ai", impactSource: "ai" };
  });
}

const MODEL = process.env.CATEGORY_MODEL ?? "claude-sonnet-5-5";

type Guess = { category: ProductCategory; packagingType: PackagingType; confidence: number };

/** The estimate for lines a shop hasn't listed: the AI says, from the name alone, whether the product is plastic-free and in which
 *  category and packaging. Names it isn't sure about are left out, and count nothing. */
async function classify(names: string[]): Promise<Map<string, Guess>> {
  const out = new Map<string, Guess>();
  if (!names.length || !process.env.ANTHROPIC_API_KEY) return out;
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
                  properties: { index: { type: "integer" }, category: { type: "string", enum: [...PRODUCT_CATEGORIES, "not_eco"] }, packaging: { type: "string", enum: [...PACKAGING_TYPES] }, confidence: { type: "number" } },
                  required: ["index", "category", "packaging", "confidence"],
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
        content: `These are product lines from an eco shop's receipt or order. For each, decide whether it is sold without plastic packaging or replaces a single-use plastic item, and if so its category and packaging.

Categories:
${PRODUCT_CATEGORIES.map((c) => `- ${c}: ${CATEGORY_LABELS[c].label} (${CATEGORY_LABELS[c].examples})`).join("\n")}
- not_eco: anything else, or when the name doesn't tell (shipping, gift cards, services, ordinary packaged goods).
Packaging: ${PACKAGING_TYPES.map((t) => `${t} (${PACKAGING_LABELS[t]})`).join(", ")}. A solid bar or a reusable item with no pack is "none".
Use "not_eco" unless the name clearly says it. confidence is 0 to 1.

${names.map((n, i) => `${i}. ${n}`).join("\n")}`,
      }],
    });
    const block = res.content.find((b) => b.type === "text");
    const j = JSON.parse(block && "text" in block ? block.text : "{}") as { lines?: { index: number; category: string; packaging: string; confidence: number }[] };
    for (const l of j.lines ?? []) {
      const name = names[l.index];
      if (name && isCategory(l.category) && isPackaging(l.packaging)) out.set(name, { category: l.category, packagingType: l.packaging, confidence: Math.max(0, Math.min(1, Number(l.confidence) || 0)) });
    }
  } catch (e) { console.error("line classification failed", e); }
  return out;
}
