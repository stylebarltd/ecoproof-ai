import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES, type Category, type LineItem } from "./impact";
import { superbeeParts } from "./superbeeCatalogue";

/**
 * The single entry point to the proof loop. Deliberately small: no prices, no customer personal data.
 * `category` is optional; when absent we match the product name against the brand catalogue, then ask the AI.
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

// ---- Item -> category matching ------------------------------------------------------------------------------------

export type Matched = LineItem & { source: "given" | "catalogue" | "ai" | "none" };

const isCategory = (c: string | undefined): c is Category => !!c && (CATEGORIES as readonly string[]).includes(c);

export async function matchItems(order: Order): Promise<Matched[]> {
  const out: Matched[] = [];
  for (const it of order.items) {
    if (isCategory(it.category)) { out.push({ name: it.name, quantity: it.quantity, category: it.category, confidence: 1, source: "given" }); continue; }
    const parts = order.brandId === "superbee" ? superbeeParts(it.productId, it.name) : null; // by product id (English and Thai listings), else by name
    if (parts) {
      if (!parts.length) out.push({ name: it.name, quantity: it.quantity, category: "not_sustainable", confidence: 1, source: "catalogue" }); // known, but not counted (raw fabric, fire starters)
      for (const [category, count] of parts) out.push({ name: it.name, quantity: it.quantity * count, category, confidence: 1, source: "catalogue" }); // a bundle is several products
      continue;
    }
    const ai = await inferCategory(it.name);
    out.push({ name: it.name, quantity: it.quantity, ...ai });
  }
  return out;
}

const MODEL = process.env.CATEGORY_MODEL ?? "claude-sonnet-5-5";

/** Fallback for products we have no mapping for: the AI picks a category from the fixed list (or "not_sustainable"). */
async function inferCategory(name: string): Promise<{ category: Category; confidence: number; source: "ai" | "none" }> {
  if (!process.env.ANTHROPIC_API_KEY) return { category: "not_sustainable", confidence: 0, source: "none" };
  try {
    const res = await new Anthropic().messages.create({
      model: MODEL,
      max_tokens: 2000,
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: { category: { type: "string", enum: [...CATEGORIES] }, confidence: { type: "number" } },
            required: ["category", "confidence"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: `Classify this online-shop product into one sustainability category. Use "not_sustainable" unless it clearly replaces a single-use or disposable product. Product: "${name}"` }],
    });
    const block = res.content.find((b) => b.type === "text");
    const j = JSON.parse(block && "text" in block ? block.text : "{}") as { category?: string; confidence?: number };
    if (!isCategory(j.category)) console.warn("category inference gave", JSON.stringify(j), "for", name);
    if (isCategory(j.category)) return { category: j.category, confidence: Math.max(0, Math.min(1, Number(j.confidence) || 0)), source: "ai" };
  } catch (e) { console.error("category inference failed", e); }
  return { category: "not_sustainable", confidence: 0, source: "none" };
}
