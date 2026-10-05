import { query, type RecordRow } from "./db";
import { addressUrl, payerAddress } from "./solana";
import { identityGroup } from "./users";
import { publicIdFor } from "./publicId";
import { stampDay } from "./stampPlaces";
import { looksLikeWallet } from "./session";
import { listNfts, type Nft } from "./milestones";
import { nextMilestone } from "./nft";
import { pointsFor, stampClass, type StampClass } from "./stampClasses";

export type Totals = { receipts: number; co2Kg: number; plasticItems: number; packagingG: number; sustainableItems: number };
export type Passport = {
  userId: string;
  /** The id for share links (never the device id, which acts as the anonymous passport's password). */
  publicId: string;
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
  // A place QR gives one stamp per person per day. Devices that collected stamps before they were linked to the same wallet
  // would otherwise double up, so only the first QR stamp per place per day counts. Every number shown (points, stamp counts,
  // the per-place ×N bubble) uses only the stamps that count; the proof list still shows every record (a duplicate earns 0 points).
  const seen = new Set<string>();
  const stamps = [...rows].reverse().filter((r) => { // oldest first, so the first stamp of the day is the one kept
    if (r.source !== "qr" || !r.place_id) return true;
    const key = `${r.place_id}:${stampDay(new Date(r.created_at))}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).reverse();
  const counted = new Set(stamps.map((r) => r.id));
  const points = stamps.reduce((n, r) => n + pointsFor(r.source), 0);
  const totals: Totals = { receipts: stamps.length, co2Kg: 0, plasticItems: 0, packagingG: 0, sustainableItems: 0 };
  for (const r of stamps) {
    totals.co2Kg += r.co2_kg ?? 0;
    totals.plasticItems += r.plastic_items ?? 0;
    totals.packagingG += r.packaging_g ?? 0;
    totals.sustainableItems += r.sustainable_items ?? 0;
  }
  totals.co2Kg = Math.round(totals.co2Kg * 100) / 100;
  return {
    userId,
    publicId: await publicIdFor(looksLikeWallet(ids[0]) ? ids[0] : userId),
    wallet: looksLikeWallet(ids[0]) ? ids[0] : null,
    totals,
    places: (await query<{ id: string; name: string; impact_note: string | null; status: string }>("SELECT id,name,impact_note,status FROM stamp_places ORDER BY created_at, name")).filter((pl) => pl.status === "active" || stamps.some((r) => r.place_id === pl.id)).map((pl) => { // hide paused places unless this passport has stamps from them
      const mine = stamps.filter((r) => r.place_id === pl.id);
      return { id: pl.id, name: pl.name, imageUrl: `/api/stamp-places/${pl.id}/stamp`, impactNote: pl.impact_note, earned: mine.length > 0, count: mine.length, verifiedCount: mine.filter((r) => stampClass(r.source) === "verified").length };
    }),
    anchored: rows.filter((r) => r.signature).length,
    nfts: (await listNfts(userId)).map((n) => ({ ...n, imageUrl: `/api/nft/${n.id}/image`, metadataUrl: `/api/nft/${n.id}/metadata` })),
    points,
    stampsByClass: { verified: stamps.filter((r) => stampClass(r.source) === "verified").length, presence: stamps.filter((r) => stampClass(r.source) === "presence").length },
    verifiedStamps: stamps.filter((r) => stampClass(r.source) === "verified").slice(0, 12).map((r) => ({
      id: r.id, placeId: r.place_id ?? null, placeName: r.merchant, imageUrl: r.place_id ? `/api/stamp-places/${r.place_id}/stamp` : null,
      impactNote: r.impact_note ?? null, plasticItems: r.plastic_items ?? 0, co2Kg: r.co2_kg ?? 0, createdAt: new Date(r.created_at).toISOString(),
    })),
    nextMilestone: nextMilestone(points),
    registryUrl: (() => { const a = payerAddress(); return a ? addressUrl(a) : null; })(),
    records: rows.slice(0, 20).map((r) => ({
      id: r.id, placeId: r.place_id ?? null, source: r.source ?? null, class: stampClass(r.source), points: counted.has(r.id) ? pointsFor(r.source) : 0, impactNote: r.impact_note ?? null, merchant: r.merchant, co2Kg: r.co2_kg, plasticItems: r.plastic_items,
      verified: !!r.signature, signature: r.signature, createdAt: new Date(r.created_at).toISOString(),
    })),
  };
}

/** A passport as shown to anyone holding a share link: addressed by its public id, with the device id removed. */
export const publicPassport = (p: Passport): Passport => ({ ...p, userId: p.publicId });
