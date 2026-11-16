import { query } from "./db";
import { bestFuzzy, exactKey, type Named } from "./matchText";

// Which of a shop's declared products a receipt line is (docs/eco-product-standard.md): the exact receipt name, then an alias, then a
// fuzzy match on the words (lib/matchText.ts). A removed product never matches. Lines that match nothing are kept in receipt_lines and
// wait in the owner's "Confirm these products?" queue.

export type Match = { productId: string; confidence: number; via: "name" | "alias" | "fuzzy" };

type Known = { names: Named[]; aliases: Named[] };

/** A place's products that can still match, with their aliases. */
async function known(placeId: string): Promise<Known> {
  const [names, aliases] = await Promise.all([
    query<{ id: string; receipt_name: string }>("SELECT id, receipt_name FROM products WHERE place_id=$1 AND status <> 'removed'", [placeId]),
    query<{ product_id: string; receipt_name_variant: string }>(
      "SELECT a.product_id, a.receipt_name_variant FROM product_aliases a JOIN products p ON p.id = a.product_id WHERE p.place_id=$1 AND p.status <> 'removed'", [placeId],
    ),
  ]);
  return {
    names: names.map((r) => ({ productId: r.id, name: r.receipt_name })),
    aliases: aliases.map((r) => ({ productId: r.product_id, name: r.receipt_name_variant })),
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

/** Matches a receipt's lines and keeps them: the matched ones with their product, the others for the owner's queue. */
export async function recordLines(placeId: string, claimId: string | null, lines: { rawText: string; price?: number | null }[]): Promise<(Match | null)[]> {
  if (!lines.length) return [];
  const k = await known(placeId);
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
