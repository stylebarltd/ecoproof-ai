import { query } from "./db";
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
};

export async function landingStats(): Promise<LandingStats | null> {
  try {
    const [[t], [latest], shops] = await Promise.all([
      query<{ proofs: number; passports: number; plastic: number; co2: number }>(
        `SELECT COUNT(*) FILTER (WHERE signature IS NOT NULL)::int AS proofs, COUNT(DISTINCT user_id)::int AS passports,
                COALESCE(SUM(plastic_items), 0)::int AS plastic, COALESCE(SUM(co2_kg), 0)::float8 AS co2
           FROM records`,
      ),
      query<{ signature: string }>("SELECT signature FROM records WHERE signature IS NOT NULL ORDER BY created_at DESC LIMIT 1"),
      listShops(null),
    ]);
    const best = shops.filter((s) => s.impact.purchases > 0).sort((a, b) => b.impact.purchases - a.impact.purchases)[0];
    return {
      proofs: t.proofs, passports: t.passports, plasticItems: t.plastic, co2Kg: Math.round(t.co2),
      proofUrl: latest ? explorerUrl(latest.signature) : null,
      example: best ? { id: best.id, name: best.name, impact: best.impact } : null,
    };
  } catch (e) {
    console.error("landing stats failed", e);
    return null; // the page still renders, without the counter strip
  }
}
