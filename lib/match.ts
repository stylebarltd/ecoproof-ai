import { query } from "./db";
import { bestFuzzy, exactKey, type Named } from "./matchText";
import type { PackagingType, ProductCategory } from "./productRules";

// Which of a shop's declared products a receipt line is (docs/eco-product-standard.md): the exact receipt name, then an alias, then a
// fuzzy match on the words (lib/matchText.ts). A removed product never matches. Lines that match nothing are kept in receipt_lines and
// wait in the owner's "Confirm these products?" queue; until the owner decides, lib/order.ts estimates them.

export type Match = { productId: string; confidence: number; via: "name" | "alias" | "fuzzy" };

export type KnownProduct = { category: ProductCategory; packagingType: PackagingType };
type Known = { names: Named[]; aliases: Named[]; products: Map<string, KnownProduct>; blocked: Set<string> };

/** A place's products that can still match, with their aliases; and the wordings that must count nothing: removed products (two
 *  confirmed reports) and receipt lines the owner dismissed as not plastic-free. */
async function known(placeId: string): Promise<Known> {
  const [rows, aliases, dismissed] = await Promise.all([
    query<{ id: string; receipt_name: string; category: ProductCategory; packaging_type: PackagingType; status: string }>("SELECT id, receipt_name, category, packaging_type, status FROM products WHERE place_id=$1", [placeId]),
    query<{ product_id: string; receipt_name_variant: string }>("SELECT a.product_id, a.receipt_name_variant FROM product_aliases a JOIN products p ON p.id = a.product_id WHERE p.place_id=$1", [placeId]),
    query<{ raw_text: string }>("SELECT DISTINCT raw_text FROM receipt_lines WHERE place_id=$1 AND dismissed", [placeId]),
  ]);
  const live = rows.filter((r) => r.status !== "removed");
  const removed = new Set(rows.filter((r) => r.status === "removed").map((r) => r.id));
  return {
    names: live.map((r) => ({ productId: r.id, name: r.receipt_name })),
    aliases: aliases.filter((a) => !removed.has(a.product_id)).map((r) => ({ productId: r.product_id, name: r.receipt_name_variant })),
    products: new Map(live.map((r) => [r.id, { category: r.category, packagingType: r.packaging_type }])),
    blocked: new Set([
      ...rows.filter((r) => removed.has(r.id)).map((r) => exactKey(r.receipt_name)),
      ...aliases.filter((a) => removed.has(a.product_id)).map((a) => exactKey(a.receipt_name_variant)),
      ...dismissed.map((d) => exactKey(d.raw_text)),
    ]),
  };
}

function matchIn(k: Known, rawText: string): Match | null {
  const key = exactKey(rawText);
  if (!key) return null;
  const name = k.names.find((n) => exactKey(n.name) === key);
  if (name) return { productId: name.productId, confidence: 1, via: "name" };
  const alias = k.aliases.find((n) => exactKey(n.name) === key);
  if (alias) return { productId: alias.productId, confidence: 1, via: "alias" };
  const fuzzy = bestFuzzy(rawText, [...k.names, ...k.aliases]);
  return fuzzy && { ...fuzzy, via: "fuzzy" };
}

/** The product a receipt line is, or null. */
export async function matchLine(placeId: string, rawText: string): Promise<Match | null> {
  return matchIn(await known(placeId), rawText);
}

export type LineMatch =
  | { kind: "product"; productId: string; confidence: number; product: KnownProduct } // one of the shop's declared products
  | { kind: "blocked" } // a removed product, or a wording the owner dismissed: counts nothing, and is never estimated
  | { kind: "unknown" }; // not on the shop's list yet

/** What each line of a receipt or an order is at this shop, in one read of its product list. */
export async function matchLines(placeId: string, texts: string[]): Promise<LineMatch[]> {
  const k = await known(placeId);
  return texts.map((t) => {
    const m = matchIn(k, t);
    if (m) return { kind: "product", productId: m.productId, confidence: m.confidence, product: k.products.get(m.productId)! };
    return k.blocked.has(exactKey(t)) ? { kind: "blocked" } : { kind: "unknown" };
  });
}

/** Matches a receipt's lines and keeps them: the matched ones with their product, the others for the owner's queue. */
export async function recordLines(placeId: string, claimId: string | null, lines: { rawText: string; price?: number | null }[]): Promise<(Match | null)[]> {
  if (!lines.length) return [];
  const k = await known(placeId);
  lines = lines.filter((l) => !k.blocked.has(exactKey(l.rawText))); // a removed product or a dismissed wording is settled: not queued again
  if (!lines.length) return [];
  const matches = lines.map((l) => matchIn(k, l.rawText));
  await query(
    `INSERT INTO receipt_lines (place_id, claim_id, raw_text, price, matched_product_id, confidence)
     SELECT $1, $2, * FROM unnest($3::text[], $4::float8[], $5::text[], $6::float8[])`,
    [placeId, claimId, lines.map((l) => l.rawText), lines.map((l) => l.price ?? null), matches.map((m) => m?.productId ?? null), matches.map((m) => m?.confidence ?? null)],
  );
  return matches;
}

export type QueuedLine = { rawText: string; times: number; lastSeen: string };

/** The owner's queue: receipt lines of this place that matched no product, each wording once, the most scanned first. */
export async function unmatchedLines(placeId: string, limit = 50): Promise<QueuedLine[]> {
  const rows = await query<{ raw_text: string; times: number; last_seen: string }>(
    `SELECT MIN(raw_text) AS raw_text, COUNT(*)::int AS times, MAX(created_at)::text AS last_seen FROM receipt_lines
     WHERE place_id=$1 AND matched_product_id IS NULL GROUP BY lower(btrim(raw_text)) HAVING NOT bool_or(dismissed) ORDER BY times DESC, MAX(created_at) DESC LIMIT $2`,
    [placeId, limit],
  );
  return rows.map((r) => ({ rawText: r.raw_text, times: r.times, lastSeen: r.last_seen }));
}
