import { query, type RecordRow } from "./db";
import { addressUrl, payerAddress } from "./solana";
import { identityGroup } from "./users";
import { looksLikeWallet } from "./session";
import { listNfts, type Nft } from "./milestones";
import { nextMilestone } from "./nft";
import { pointsFor, stampClass, type StampClass } from "./stampClasses";

export type Totals = { byoCups: number; reviews: number; receipts: number; co2Kg: number; plasticItems: number; packagingG: number; sustainableItems: number };
export type Passport = {
  userId: string;
  wallet: string | null;
  totals: Totals;
  anchored: number;
  nfts: Nft[];
  /** Every joined place; `earned` = this passport has at least one stamp from it. */
  places: { id: string; name: string; imageUrl: string; impactNote: string | null; earned: boolean; count: number; verifiedCount: number }[];
  /** Milestones count points: a verified purchase is worth more than a presence stamp (lib/stampClasses.ts). */
  points: number;
  stampsByClass: { verified: number; presence: number };
  /** Verified purchase stamps, newest first, with the order's real impact. */
  verifiedStamps: { id: string; placeId: string | null; placeName: string; imageUrl: string | null; impactNote: string | null; plasticItems: number; co2Kg: number; createdAt: string }[];
  nextMilestone: number;
  registryUrl: string | null;
  records: { id: string; placeId: string | null; source: string | null; class: StampClass; points: number; impactNote: string | null; merchant: string; co2Kg: number; plasticItems: number; verified: boolean; signature: string | null; createdAt: string }[];
};

export async function getPassport(userId: string): Promise<Passport> {
  const ids = await identityGroup(userId);
  const rows = await query<RecordRow>("SELECT * FROM records WHERE user_id = ANY($1) ORDER BY created_at DESC", [ids]);
  const rev = await query<{ byo_cup: boolean; created_at: string }>("SELECT byo_cup, created_at FROM reviews WHERE user_id = ANY($1)", [ids]);
  const cups = rev.filter((r) => r.byo_cup);
  const points = rows.reduce((n, r) => n + pointsFor(r.source), 0); // milestones count points, not stamps
  const totals: Totals = { byoCups: cups.length, reviews: rev.length, receipts: rows.length, co2Kg: 0, plasticItems: 0, packagingG: 0, sustainableItems: 0 };
  for (const r of rows) {
    totals.co2Kg += r.co2_kg ?? 0;
    totals.plasticItems += r.plastic_items ?? 0;
    totals.packagingG += r.packaging_g ?? 0;
    totals.sustainableItems += r.sustainable_items ?? 0;
  }
  // Each bring-your-own-cup visit avoids one disposable cup (~15 g, ~0.1 kg CO2).
  totals.co2Kg += cups.length * 0.1;
  totals.plasticItems += cups.length;
  totals.packagingG += cups.length * 15;
  totals.co2Kg = Math.round(totals.co2Kg * 100) / 100;
  return {
    userId,
    wallet: looksLikeWallet(ids[0]) ? ids[0] : null,
    totals,
    places: (await query<{ id: string; name: string; impact_note: string | null; status: string }>("SELECT id,name,impact_note,status FROM stamp_places ORDER BY created_at, name")).filter((pl) => pl.status === "active" || rows.some((r) => r.place_id === pl.id)).map((pl) => { // hide paused places unless this passport has stamps from them
      const mine = rows.filter((r) => r.place_id === pl.id);
      return { id: pl.id, name: pl.name, imageUrl: `/api/stamp-places/${pl.id}/stamp`, impactNote: pl.impact_note, earned: mine.length > 0, count: mine.length, verifiedCount: mine.filter((r) => stampClass(r.source) === "verified").length };
    }),
    anchored: rows.filter((r) => r.signature).length,
    nfts: (await listNfts(userId)).map((n) => ({ ...n, imageUrl: `/api/nft/${n.id}/image`, metadataUrl: `/api/nft/${n.id}/metadata` })),
    points,
    stampsByClass: { verified: rows.filter((r) => stampClass(r.source) === "verified").length, presence: rows.filter((r) => stampClass(r.source) === "presence").length },
    verifiedStamps: rows.filter((r) => stampClass(r.source) === "verified").slice(0, 12).map((r) => ({
      id: r.id, placeId: r.place_id ?? null, placeName: r.merchant, imageUrl: r.place_id ? `/api/stamp-places/${r.place_id}/stamp` : null,
      impactNote: r.impact_note ?? null, plasticItems: r.plastic_items ?? 0, co2Kg: r.co2_kg ?? 0, createdAt: new Date(r.created_at).toISOString(),
    })),
    nextMilestone: nextMilestone(points),
    registryUrl: (() => { const a = payerAddress(); return a ? addressUrl(a) : null; })(),
    records: rows.slice(0, 20).map((r) => ({
      id: r.id, placeId: r.place_id ?? null, source: r.source ?? null, class: stampClass(r.source), points: pointsFor(r.source), impactNote: r.impact_note ?? null, merchant: r.merchant, co2Kg: r.co2_kg, plasticItems: r.plastic_items,
      verified: !!r.signature, signature: r.signature, createdAt: new Date(r.created_at).toISOString(),
    })),
  };
}
