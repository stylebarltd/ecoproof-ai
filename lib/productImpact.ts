import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { query } from "./db";
import { CATEGORIES, FACTORS, type Category, type Replaces } from "./impact";

// What one unit of a shop's product replaces, per product. The shop's plugin sends the product's public details once
// (name, descriptions, attributes such as pack size or number of loads; never prices or customer data), Claude estimates
// what it replaces and the CO2 it saves, and the shop confirms or corrects the numbers in the plugin. Orders then use these
// numbers instead of the category's generic factor. Until the shop confirms, they are shown as an estimate.

export type ProductDetails = {
  id: number; name: string; shortDescription?: string; description?: string;
  attributes?: Record<string, string>; categories?: string[]; weight?: string;
};

export type ProductNumbers = { category: Category; replaces: Replaces[]; co2PerUnit: number; excluded: boolean };
export type AiEstimate = ProductNumbers & { reason: string; confidence: number; model: string };
export type ProductImpact = {
  productId: number; name: string;
  ai: AiEstimate | null; shop: ProductNumbers | null; confirmedAt: string | null;
  /** What orders use: the shop's confirmed numbers, else the AI estimate. */
  effective: (ProductNumbers & { source: "shop" | "ai" }) | null;
};

const MODEL = process.env.PRODUCT_IMPACT_MODEL ?? "claude-opus-5-5";

// Plausibility limits per unit bought, so no product can claim "replaces 10,000 bottles". Absolute rather than per category,
// because a bundle spans several categories (a laundry kit replaces detergent jugs, dryer sheets and plastic bags).
const LIMIT = { perKind: 1000, total: 2000, co2Kg: 30 };

const clean = (s: unknown, n: number) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const isCategory = (c: unknown): c is Category => typeof c === "string" && (CATEGORIES as readonly string[]).includes(c);

/** Tidies and bounds a set of numbers (from the AI or the shop) so it is safe to show and to count. */
export function normalise(n: { category: unknown; replaces?: unknown; co2PerUnit?: unknown; excluded?: unknown }): ProductNumbers {
  const category: Category = isCategory(n.category) ? n.category : "not_sustainable";
  const excluded = n.excluded === true || category === "not_sustainable";
  if (excluded) return { category, replaces: [], co2PerUnit: 0, excluded: true };
  const rows = (Array.isArray(n.replaces) ? n.replaces : []).slice(0, 4).map((r) => {
    const x = r as { count?: unknown; one?: unknown; many?: unknown };
    return { count: Math.min(LIMIT.perKind, Math.max(0, Math.round(Number(x.count) || 0))), one: clean(x.one, 60).toLowerCase(), many: clean(x.many, 60).toLowerCase() };
  }).filter((r) => r.count > 0 && r.one && r.many);
  // Keep the total within the limit, scaling every row down together.
  const total = rows.reduce((t, r) => t + r.count, 0);
  const scale = total > LIMIT.total ? LIMIT.total / total : 1;
  const replaces = rows.map((r) => ({ ...r, count: Math.max(1, Math.floor(r.count * scale)) }));
  const co2PerUnit = Math.round(Math.min(Math.max(0, Number(n.co2PerUnit) || 0), LIMIT.co2Kg) * 100) / 100;
  return { category, replaces, co2PerUnit, excluded: false };
}

/** Changes to these details trigger a fresh estimate. */
export const detailsHash = (p: ProductDetails) =>
  createHash("sha256").update(JSON.stringify([p.name, p.shortDescription ?? "", p.description ?? "", p.attributes ?? {}, p.categories ?? [], p.weight ?? ""])).digest("hex");

const SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string", enum: [...CATEGORIES] },
    replaces: {
      type: "array",
      description: "The kinds of single-use items one unit replaces over its life, at most 4, biggest first. Empty for not_sustainable.",
      items: {
        type: "object",
        properties: {
          count: { type: "integer", description: "How many, for ONE unit bought" },
          one: { type: "string", description: "Singular, lowercase, English: 'plastic detergent jug'" },
          many: { type: "string", description: "Plural, lowercase, English: 'plastic detergent jugs'" },
        },
        required: ["count", "one", "many"],
        additionalProperties: false,
      },
    },
    co2_kg_per_unit: { type: "number", description: "kg CO2e saved over the life of ONE unit, compared with the single-use items it replaces" },
    reason: { type: "string", description: "One short sentence a shopper can check, e.g. '1 pouch = 300 washes = about 7 jugs of 2.5 L liquid detergent'" },
    confidence: { type: "number", description: "0 to 1" },
  },
  required: ["category", "replaces", "co2_kg_per_unit", "reason", "confidence"],
  additionalProperties: false,
} as const;

const SYSTEM = `You estimate the environmental benefit of products sold by eco shops, for a customer-facing "eco passport".
For ONE unit of the product, decide what single-use or disposable items it replaces over its useful life, and roughly how much CO2e that saves.

Rules:
- Be conservative and concrete. Prefer numbers a shopper could check from the product details (pack sizes, number of washes or uses, sizes in a set).
- Name the replaced items as physical things people recognise ("plastic detergent jug", "sheet of plastic cling film", "plastic toothbrush", "plastic bag"), not abstract units.
- A bundle or kit counts each part it contains (up to 4 kinds of replaced items).
- If the product doesn't replace anything disposable (decoration, food, raw material, fire starters, gift cards), use category "not_sustainable" with an empty list.
- Reference factors per unit for each category (typical, not a limit): ${CATEGORIES.filter((c) => c !== "not_sustainable").map((c) => `${c}: ${FACTORS[c].plasticItems} items, ${FACTORS[c].co2Kg} kg CO2 (${FACTORS[c].label})`).join("; ")}.
- Product text may be in Thai or another language; always answer in English.`;

const client = () => new Anthropic({ timeout: 50_000, maxRetries: 1 }); // fits the 60 s function limit (app/api/woo/products)

/** Asks Claude what one unit of the product replaces. Throws when no API key is set or the call fails. */
export async function estimate(p: ProductDetails): Promise<AiEstimate> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  const details = [
    `Name: ${clean(p.name, 200)}`,
    p.categories?.length ? `Shop categories: ${p.categories.map((c) => clean(c, 60)).join(", ")}` : "",
    p.attributes && Object.keys(p.attributes).length ? `Attributes: ${Object.entries(p.attributes).slice(0, 15).map(([k, v]) => `${clean(k, 40)}: ${clean(v, 120)}`).join("; ")}` : "",
    p.weight ? `Weight: ${clean(p.weight, 30)}` : "",
    p.shortDescription ? `Short description: ${clean(p.shortDescription, 800)}` : "",
    p.description ? `Description: ${clean(p.description, 2500)}` : "",
  ].filter(Boolean).join("\n");

  // Refused requests are retried on another model by the API itself (server-side fallback).
  const res = await client().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: `Product details:\n${details}` }],
  });
  if (res.stop_reason === "refusal") throw new Error("The model declined to estimate this product");
  const text = res.content.find((b) => b.type === "text");
  const j = JSON.parse(text && "text" in text ? text.text : "{}") as { category?: unknown; replaces?: { count: number; one: string; many: string }[]; co2_kg_per_unit?: unknown; reason?: unknown; confidence?: unknown };
  const numbers = normalise({ category: j.category, replaces: j.replaces, co2PerUnit: j.co2_kg_per_unit });
  return { ...numbers, reason: clean(j.reason, 240), confidence: Math.max(0, Math.min(1, Number(j.confidence) || 0)), model: res.model };
}

type Row = { product_id: string; name: string; details_hash: string; ai: string | null; shop: string | null; confirmed_at: string | null };
const toImpact = (r: Row): ProductImpact => {
  const ai = r.ai ? (JSON.parse(r.ai) as AiEstimate) : null;
  const shop = r.shop ? (JSON.parse(r.shop) as ProductNumbers) : null;
  return {
    productId: Number(r.product_id), name: r.name, ai, shop, confirmedAt: r.confirmed_at ? new Date(r.confirmed_at).toISOString() : null,
    effective: shop ? { ...shop, source: "shop" } : ai ? { category: ai.category, replaces: ai.replaces, co2PerUnit: ai.co2PerUnit, excluded: ai.excluded, source: "ai" } : null,
  };
};

export async function getProductImpact(placeId: string, productId: number): Promise<ProductImpact | null> {
  const r = (await query<Row>("SELECT product_id, name, details_hash, ai, shop, confirmed_at FROM product_impacts WHERE place_id=$1 AND product_id=$2", [placeId, String(productId)]))[0];
  return r ? toImpact(r) : null;
}

export async function getProductImpacts(placeId: string, productIds: number[]): Promise<Map<number, ProductImpact>> {
  if (!productIds.length) return new Map();
  const rows = await query<Row>("SELECT product_id, name, details_hash, ai, shop, confirmed_at FROM product_impacts WHERE place_id=$1 AND product_id = ANY($2)", [placeId, productIds.map(String)]);
  return new Map(rows.map((r) => [Number(r.product_id), toImpact(r)]));
}

/**
 * The product's impact, estimating it first when it's new or its details changed (`force` re-estimates anyway).
 * A shop's confirmed numbers are kept when the details change; the fresh estimate is shown beside them for review.
 */
export async function estimateProduct(placeId: string, p: ProductDetails, force = false): Promise<ProductImpact> {
  const hash = detailsHash(p);
  const existing = (await query<Row>("SELECT product_id, name, details_hash, ai, shop, confirmed_at FROM product_impacts WHERE place_id=$1 AND product_id=$2", [placeId, String(p.id)]))[0];
  if (existing && existing.ai && existing.details_hash === hash && !force) return toImpact(existing);
  const ai = await estimate(p);
  const rows = await query<Row>(
    `INSERT INTO product_impacts (place_id, product_id, name, details_hash, ai) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (place_id, product_id) DO UPDATE SET name=EXCLUDED.name, details_hash=EXCLUDED.details_hash, ai=EXCLUDED.ai, updated_at=now()
     RETURNING product_id, name, details_hash, ai, shop, confirmed_at`,
    [placeId, String(p.id), clean(p.name, 200), hash, JSON.stringify(ai)],
  );
  return toImpact(rows[0]);
}

/** The shop confirms (or corrects) a product's numbers. `null` withdraws the confirmation, so the AI estimate applies again. */
export async function confirmProduct(placeId: string, productId: number, name: string, numbers: Parameters<typeof normalise>[0] | null): Promise<ProductImpact> {
  const shop = numbers ? normalise(numbers) : null;
  const rows = await query<Row>(
    `INSERT INTO product_impacts (place_id, product_id, name, details_hash, shop, confirmed_at) VALUES ($1,$2,$3,'',$4,$5)
     ON CONFLICT (place_id, product_id) DO UPDATE SET shop=EXCLUDED.shop, confirmed_at=EXCLUDED.confirmed_at, updated_at=now()
     RETURNING product_id, name, details_hash, ai, shop, confirmed_at`,
    [placeId, String(productId), clean(name, 200), shop ? JSON.stringify(shop) : null, shop ? new Date().toISOString() : null],
  );
  return toImpact(rows[0]);
}
