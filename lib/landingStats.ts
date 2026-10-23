import { query, type RecordRow } from "./db";
import { claimUrl } from "./claim";
import { explorerUrl } from "./solana";
import { listShops, type ShopListing } from "./shops";

/** The live numbers on the signed-out landing page: what EcoProof has verified so far, one real proof to look at, and the shop with the most
 *  verified purchases as the example impact widget. Everything is an estimate from lib/impact.ts, and the page says so. */
export type LandingStats = {
  proofs: number;
  passports: number;
  plasticItems: number;
  co2Kg: number;
  /** Solana Explorer link to the newest proof, or null before the first one. */
  proofUrl: string | null;
  example: Pick<ShopListing, "id" | "name" | "impact"> | null;
  /** The newest verified purchase with a proof: the one real record the landing shows and lets visitors check. */
  record: LandingRecord | null;
};

export type LandingRecord = {
  id: string; merchant: string; date: string; items: { name: string; quantity: number }[];
  plasticItems: number; co2Kg: number; packagingG: number; note: string | null; hash: string; signature: string; txUrl: string;
  /** Solana Explorer link to the order's claim account, when it has one. */
  claimUrl: string | null;
};

export async function landingStats(): Promise<LandingStats | null> {
  try {
    const [[t], [latest], shops, [rec]] = await Promise.all([
      query<{ proofs: number; passports: number; plastic: number; co2: number }>(
        `SELECT COUNT(*) FILTER (WHERE signature IS NOT NULL)::int AS proofs, COUNT(DISTINCT user_id)::int AS passports,
                COALESCE(SUM(plastic_items), 0)::int AS plastic, COALESCE(SUM(co2_kg), 0)::float8 AS co2
           FROM records`,
      ),
      query<{ signature: string }>("SELECT signature FROM records WHERE signature IS NOT NULL ORDER BY created_at DESC LIMIT 1"),
      listShops(null),
      query<RecordRow>("SELECT * FROM records WHERE signature IS NOT NULL AND items <> '[]' AND (co2_kg > 0 OR plastic_items > 0) ORDER BY created_at DESC LIMIT 1"),
    ]);
    let items: LandingRecord["items"] = [];
    try { items = rec ? (JSON.parse(rec.items) as LandingRecord["items"]).map(({ name, quantity }) => ({ name, quantity })) : []; } catch { /* shown without its lines */ }
    const best = shops.filter((s) => s.impact.purchases > 0).sort((a, b) => b.impact.purchases - a.impact.purchases)[0];
    return {
      proofs: t.proofs, passports: t.passports, plasticItems: t.plastic, co2Kg: Math.round(t.co2),
      proofUrl: latest ? explorerUrl(latest.signature) : null,
      example: best ? { id: best.id, name: best.name, impact: best.impact } : null,
      record: rec ? {
        id: rec.id, merchant: rec.merchant, date: new Date(rec.created_at).toISOString(), items,
        plasticItems: rec.plastic_items, co2Kg: Math.round(rec.co2_kg * 10) / 10, packagingG: Math.round(rec.packaging_g), note: rec.impact_note ?? null,
        hash: rec.hash, signature: rec.signature!, txUrl: explorerUrl(rec.signature!), claimUrl: rec.claim_address ? claimUrl(rec.claim_address) : null,
      } : null,
    };
  } catch (e) {
    console.error("landing stats failed", e);
    return null; // the page still renders, without the counter strip
  }
}
