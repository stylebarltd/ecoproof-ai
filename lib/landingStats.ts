import { query, type RecordRow } from "./db";
import { claimUrl } from "./claim";
import { explorerUrl } from "./solana";
import { FEW_ORDERS } from "./badge";
import { latestDeclarations, toDeclaration } from "./declarations";
import { checklist, practicesOf } from "./practices";
import { listShops, shopProofs, type ShopListing, type ShopProof } from "./shops";

/** The live numbers on the signed-out landing page: what EcoProof AI has verified so far, one real proof to look at, and the shop with the most
 *  verified purchases as the example impact widget. Everything is an estimate from lib/impact.ts, and the page says so. */
export type LandingStats = {
  proofs: number;
  /** Real places (not the judges' demo places) that are active on EcoProof AI. */
  places: number;
  passports: number;
  plasticItems: number;
  co2Kg: number;
  /** Solana Explorer link to the newest proof, or null before the first one. */
  proofUrl: string | null;
  /** The example shop; while it has fewer than ORDERS_SHOWN_BELOW verified purchases, also the orders behind its numbers. */
  example: (Pick<ShopListing, "id" | "name" | "impact"> & { orders: Pick<ShopProof, "id" | "summary" | "plasticItems">[] | null }) | null;
  /** The newest verified purchase with a proof: the one real record the landing shows and lets visitors check. */
  record: LandingRecord | null;
  /** A café, restaurant or hotel with published stars, the hospitality counterpart of the shop's impact widget: a real place when one
   *  has published, else a demo place (flagged, the page says so). */
  hospitality: { food: Hospitality | null; stay: Hospitality | null };
};

export type Hospitality = {
  id: string; name: string; kind: string; demo: boolean; stars: number; score: number;
  /** Practices answered Yes, of how many asked, and a few of them by name. */
  yes: number; total: number; examples: string[];
  publishedAt: string; txUrl: string | null;
};

/** The best published star rating for a café or restaurant (`food`) and for a hotel (`stay`), so a resort manager sees a hotel's page,
 *  not a café's: real places first, then signed declarations, then most stars. */
async function hospitality(): Promise<{ food: Hospitality | null; stay: Hospitality | null }> {
  const places = await query<{ id: string; name: string; kind: string; demo: boolean; also_cafe: boolean }>(
    "SELECT id, name, kind, demo, also_cafe FROM stamp_places WHERE kind IN ('cafe','restaurant','hotel') AND status = 'active'",
  );
  const latest = await latestDeclarations(places.map((p) => p.id));
  const options = places.flatMap((p) => {
    const row = latest.get(p.id);
    if (!row || row.kind !== p.kind || row.also_cafe !== p.also_cafe) return []; // published for another type: nothing public now
    const d = toDeclaration(row);
    const asked = practicesOf(checklist(p.kind, p.also_cafe) ?? []);
    const yes = asked.filter((q) => d.answers[q.id] === "yes");
    return [{ p, d, asked, yes }];
  });
  options.sort((a, b) => Number(a.p.demo) - Number(b.p.demo) || Number(a.d.pending) - Number(b.d.pending) || b.d.stars - a.d.stars);
  const pick = (hotel: boolean) => { const best = options.find((o) => (o.p.kind === "hotel") === hotel); return best ? card(best) : null; };
  return { food: pick(false), stay: pick(true) };
}

function card(best: { p: { id: string; name: string; kind: string; demo: boolean }; d: ReturnType<typeof toDeclaration>; asked: { label: string }[]; yes: { label: string }[] }): Hospitality {
  return {
    id: best.p.id, name: best.p.name, kind: best.p.kind, demo: best.p.demo, stars: best.d.stars, score: best.d.score,
    yes: best.yes.length, total: best.asked.length, examples: best.yes.slice(0, 3).map((q) => q.label),
    publishedAt: best.d.createdAt, txUrl: best.d.txUrl,
  };
}

export type LandingRecord = {
  id: string; merchant: string; date: string; items: { name: string; quantity: number }[];
  plasticItems: number; co2Kg: number; packagingG: number; note: string | null; hash: string; signature: string; txUrl: string;
  /** Solana Explorer link to the order's claim account, when it has one. */
  claimUrl: string | null;
  /** Made in the last 14 days: only then does the page call it "the newest". */
  recent: boolean;
  /** How long ago, in words ("today", "3 days ago", "6 weeks ago"), shown next to the date so an old record reads as real, not stale. */
  age: string;
};

/** Below this many verified purchases the impact widget lists the orders themselves (the badge follows the same rule). */
const ORDERS_SHOWN_BELOW = FEW_ORDERS;

/** "today", "yesterday", "5 days ago", "6 weeks ago", "3 months ago". */
function ageText(ms: number): string {
  const d = Math.floor(ms / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 14) return `${d} days ago`;
  if (d < 63) return `${Math.round(d / 7)} weeks ago`;
  return `${Math.round(d / 30)} months ago`;
}

export async function landingStats(): Promise<LandingStats | null> {
  try {
    const [[t], [latest], shops, [rec], [pl], hosp] = await Promise.all([
      query<{ proofs: number; passports: number; plastic: number; co2: number }>(
        `SELECT COUNT(*) FILTER (WHERE signature IS NOT NULL)::int AS proofs, COUNT(DISTINCT user_id)::int AS passports,
                COALESCE(SUM(plastic_items), 0)::int AS plastic, COALESCE(SUM(co2_kg), 0)::float8 AS co2
           FROM records`,
      ),
      query<{ signature: string }>("SELECT signature FROM records WHERE signature IS NOT NULL ORDER BY created_at DESC LIMIT 1"),
      listShops(null),
      query<RecordRow>("SELECT * FROM records WHERE signature IS NOT NULL AND items <> '[]' AND (co2_kg > 0 OR plastic_items > 0) ORDER BY created_at DESC LIMIT 1"),
      query<{ places: number }>("SELECT COUNT(*)::int AS places FROM stamp_places WHERE NOT demo AND status = 'active'"),
      hospitality().catch((e) => { console.error("landing hospitality failed", e); return { food: null, stay: null }; }),
    ]);
    let items: LandingRecord["items"] = [];
    try { items = rec ? (JSON.parse(rec.items) as LandingRecord["items"]).map(({ name, quantity }) => ({ name, quantity })) : []; } catch { /* shown without its lines */ }
    const best = shops.filter((s) => s.impact.purchases > 0).sort((a, b) => b.impact.purchases - a.impact.purchases)[0];
    const orders = best && best.impact.purchases < ORDERS_SHOWN_BELOW
      ? (await shopProofs(best.id, ORDERS_SHOWN_BELOW)).map(({ id, summary, plasticItems }) => ({ id, summary, plasticItems }))
      : null;
    return {
      proofs: t.proofs, places: pl?.places ?? 0, passports: t.passports, plasticItems: t.plastic, co2Kg: t.co2,
      proofUrl: latest ? explorerUrl(latest.signature) : null,
      example: best ? { id: best.id, name: best.name, impact: best.impact, orders } : null,
      record: rec ? {
        id: rec.id, merchant: rec.merchant, date: new Date(rec.created_at).toISOString(), items,
        plasticItems: rec.plastic_items, co2Kg: Math.round(rec.co2_kg * 10) / 10, packagingG: Math.round(rec.packaging_g), note: rec.impact_note ?? null,
        hash: rec.hash, signature: rec.signature!, txUrl: explorerUrl(rec.signature!), claimUrl: rec.claim_address ? claimUrl(rec.claim_address) : null,
        recent: Date.now() - new Date(rec.created_at).getTime() < 14 * 86_400_000,
        age: ageText(Date.now() - new Date(rec.created_at).getTime()),
      } : null,
      hospitality: hosp,
    };
  } catch (e) {
    console.error("landing stats failed", e);
    return null; // the page still renders, without the counter strip
  }
}
