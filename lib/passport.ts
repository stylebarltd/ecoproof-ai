import { query, type RecordRow } from "./db";
import type { LineItem } from "./impact";
import { addressUrl, payerAddress } from "./solana";
import { identityGroup } from "./users";
import { publicIdFor } from "./publicId";
import { stampDay } from "./stampPlaces";
import { looksLikeWallet } from "./ids";
import { listNfts, listSeasonNfts, type Nft, type SeasonNft } from "./milestones";
import { nextMilestone, nftConfig } from "./nft";
import { pointsFor, stampClass, type StampClass } from "./stampClasses";
import { TRAIL_END } from "./journeyMap";

/** `plasticG`: grams of plastic avoided; `co2Kg` to the gram. */
export type Totals = { receipts: number; co2Kg: number; plasticG: number; sustainableItems: number };
export type Passport = {
  userId: string;
  /** The id for share links (never the device id, which acts as the anonymous passport's password). */
  publicId: string;
  wallet: string | null;
  totals: Totals;
  anchored: number;
  nfts: Nft[];
  /** Season cards (lib/seasonRules.ts), in the order they were given; empty while the season is off. */
  season: SeasonNft[];
  /** Every joined place; `earned` = this passport has at least one stamp from it. */
  places: { id: string; name: string; imageUrl: string; impactNote: string | null; earned: boolean; count: number; verifiedCount: number }[];
  /** Milestones count points: a verified purchase is worth more than a presence stamp (lib/stampClasses.ts). */
  points: number;
  stampsByClass: { verified: number; presence: number };
  /** Verified purchase stamps, newest first, with the order's real impact. */
  /** `basis`: "shop" when every counted line is a product the shop declared, "estimate" when any was estimated from its name, null when nothing counts. */
  verifiedStamps: { id: string; placeId: string | null; placeName: string; imageUrl: string | null; impactNote: string | null; plasticG: number; co2Kg: number; basis: "shop" | "estimate" | null; createdAt: string }[];
  nextMilestone: number;
  registryUrl: string | null;
  /** The Bee Guardians collection on Solana Explorer, or null when NFTs are not set up. */
  collectionUrl: string | null;
  /** The counted stamps that lie on the board, oldest first: stamp by stamp, which points of the trail it filled (`from` to `to`, a visit one tile, a verified
   *  purchase five). The journey map shows each tile's stamp from this (Pola, 2026-11-20: the proof trail lives on the board). Stamps past the last tile are not in it. */
  steps: PassportStep[];
  records: { id: string; placeId: string | null; source: string | null; class: StampClass; points: number; impactNote: string | null; merchant: string; co2Kg: number; plasticG: number; verified: boolean; signature: string | null; createdAt: string }[];
};

export type PassportStep = { id: string; merchant: string; placeId: string | null; source: string | null; class: StampClass; points: number; from: number; to: number; impactNote: string | null; signature: string | null; createdAt: string };

export async function getPassport(userId: string): Promise<Passport> {
  const ids = await identityGroup(userId);
  // The place's kind decides what a presence stamp is worth (lib/stampClasses.ts), so it rides along with each record.
  const rows = await query<RecordRow & { place_kind: string | null }>("SELECT r.*, p.kind AS place_kind FROM records r LEFT JOIN stamp_places p ON p.id = r.place_id WHERE r.user_id = ANY($1) ORDER BY r.created_at DESC", [ids]);
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
  const points = stamps.reduce((n, r) => n + pointsFor(r.source, r.place_kind), 0);
  const totals: Totals = { receipts: stamps.length, co2Kg: 0, plasticG: 0, sustainableItems: 0 };
  for (const r of stamps) {
    totals.co2Kg += r.co2_kg ?? 0;
    totals.plasticG += r.packaging_g ?? 0;
    totals.sustainableItems += r.sustainable_items ?? 0;
  }
  totals.co2Kg = Math.round(totals.co2Kg * 1000) / 1000;
  totals.plasticG = Math.round(totals.plasticG);
  const itemsOf = (r: RecordRow) => { try { return JSON.parse(r.items || "[]") as LineItem[]; } catch { return []; } };
  const basisOf = (items: LineItem[]) => {
    const counted = items.filter((it) => it.category !== "not_sustainable");
    return !counted.length ? null : counted.every((it) => it.impactSource === "shop") ? ("shop" as const) : ("estimate" as const);
  };
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
    season: await listSeasonNfts(userId),
    points,
    stampsByClass: { verified: stamps.filter((r) => stampClass(r.source) === "verified").length, presence: stamps.filter((r) => stampClass(r.source) === "presence").length },
    verifiedStamps: stamps.filter((r) => stampClass(r.source) === "verified").slice(0, 12).map((r) => ({
      id: r.id, placeId: r.place_id ?? null, placeName: r.merchant, imageUrl: r.place_id ? `/api/stamp-places/${r.place_id}/stamp` : null,
      impactNote: r.impact_note ?? null, basis: basisOf(itemsOf(r)), plasticG: r.packaging_g ?? 0, co2Kg: r.co2_kg ?? 0, createdAt: new Date(r.created_at).toISOString(),
    })),
    nextMilestone: nextMilestone(points),
    registryUrl: (() => { const a = payerAddress(); return a ? addressUrl(a) : null; })(),
    collectionUrl: (() => { const c = nftConfig()?.collection; return c ? addressUrl(c) : null; })(),
    steps: (() => {
      let at = 0; const out: PassportStep[] = [];
      for (const r of [...stamps].reverse()) { // oldest first
        const pts = pointsFor(r.source, r.place_kind);
        if (pts > 0 && at < TRAIL_END) out.push({ id: r.id, merchant: r.merchant, placeId: r.place_id ?? null, source: r.source ?? null, class: stampClass(r.source), points: pts, from: at + 1, to: at + pts, impactNote: r.impact_note ?? null, signature: r.signature, createdAt: new Date(r.created_at).toISOString() });
        at += pts;
      }
      return out;
    })(),
    records: rows.slice(0, 20).map((r) => ({
      id: r.id, placeId: r.place_id ?? null, source: r.source ?? null, class: stampClass(r.source), points: counted.has(r.id) ? pointsFor(r.source, r.place_kind) : 0, impactNote: r.impact_note ?? null, merchant: r.merchant, co2Kg: r.co2_kg, plasticG: r.packaging_g,
      verified: !!r.signature, signature: r.signature, createdAt: new Date(r.created_at).toISOString(),
    })),
  };
}

/** A passport as shown to anyone holding a share link: addressed by its public id, with the device id removed. */
export const publicPassport = (p: Passport): Passport => ({ ...p, userId: p.publicId });
