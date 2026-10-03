import { query, type RecordRow } from "./db";
import { addressUrl, payerAddress } from "./solana";
import { identityGroup } from "./users";
import { looksLikeWallet } from "./session";
import { listNfts, type Nft } from "./milestones";
import { nextMilestone } from "./nft";

export type Totals = { byoCups: number; reviews: number; receipts: number; co2Kg: number; plasticItems: number; packagingG: number; sustainableItems: number };
export type Badge = { id: string; icon: string; name: string; desc: string; earned: boolean };
export type Passport = {
  userId: string;
  wallet: string | null;
  totals: Totals;
  streak: number;
  longestStreak: number;
  badges: Badge[];
  anchored: number;
  nfts: Nft[];
  /** Every joined place; `earned` = this passport has at least one stamp from it. */
  places: { id: string; name: string; imageUrl: string; impactNote: string | null; earned: boolean; count: number }[];
  nextMilestone: number;
  registryUrl: string | null;
  records: { id: string; placeId: string | null; source: string | null; merchant: string; co2Kg: number; plasticItems: number; verified: boolean; signature: string | null; createdAt: string }[];
};

/** Calendar day in the user's timezone. tz = minutes as returned by Date#getTimezoneOffset() (UTC minus local; Thailand = -420). */
const day = (d: Date | string, tz = 0) => new Date(new Date(d).getTime() - tz * 60_000).toISOString().slice(0, 10);
const DAY_MS = 86_400_000;

/** Consecutive UTC days with at least one receipt. Current streak stays alive if the last receipt was today or yesterday. */
export function streaks(dates: (Date | string)[], now = new Date(), tz = 0) {
  const days = [...new Set(dates.map((d) => day(d, tz)))].sort();
  let longest = 0, run = 0, prev = 0;
  for (const d of days) {
    const t = Date.parse(d);
    run = prev && t - prev === DAY_MS ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = t;
  }
  const last = days.length ? Date.parse(days[days.length - 1]) : 0;
  const today = Date.parse(day(now, tz));
  const current = last && today - last <= DAY_MS ? run : 0;
  return { current, longest };
}

export function badgesFor(t: Totals, longest: number): Badge[] {
  const list: [string, string, string, string, boolean][] = [
    ["first", "🌱", "First Proof", "Collect your first stamp", t.receipts >= 1],
    ["plastic", "♻️", "Plastic Fighter", "Avoid 100 single-use plastics", t.plasticItems >= 100],
    ["plastic500", "🐢", "Turtle Guardian", "Avoid 500 single-use plastics", t.plasticItems >= 500],
    ["carbon", "🌍", "Carbon Cutter", "Save 5 kg CO₂", t.co2Kg >= 5],
    ["carbon25", "🌳", "Forest Maker", "Save 25 kg CO₂", t.co2Kg >= 25],
    ["streak3", "🔥", "3-Day Streak", "Log impact 3 days in a row", longest >= 3],
    ["streak7", "⚡", "Week Warrior", "Log impact 7 days in a row", longest >= 7],
    ["five", "🏅", "Regular", "Collect 5 stamps", t.receipts >= 5],
    ["review", "📍", "Place Verifier", "Review a place you visited", t.reviews >= 1],
    ["cup", "🥤", "Cup Hero", "Bring your own cup 5 times", t.byoCups >= 5],
  ];
  return list.map(([id, icon, name, desc, earned]) => ({ id, icon, name, desc, earned }));
}

export async function getPassport(userId: string, tz = 0): Promise<Passport> {
  const ids = await identityGroup(userId);
  const rows = await query<RecordRow>("SELECT * FROM records WHERE user_id = ANY($1) ORDER BY created_at DESC", [ids]);
  const rev = await query<{ byo_cup: boolean; created_at: string }>("SELECT byo_cup, created_at FROM reviews WHERE user_id = ANY($1)", [ids]);
  const cups = rev.filter((r) => r.byo_cup);
  const totals: Totals = { byoCups: cups.length, reviews: rev.length, receipts: rows.length, co2Kg: 0, plasticItems: 0, packagingG: 0, sustainableItems: 0 };
  for (const r of rows) {
    totals.co2Kg += r.co2_kg ?? 0;
    totals.plasticItems += r.plastic_items ?? 0;
    totals.packagingG += r.packaging_g ?? 0;
    totals.sustainableItems += r.sustainable_items ?? 0;
  }
  // Each bring-your-own-cup visit avoids one disposable cup (~15 g, ~0.1 kg CO2) and counts toward the streak.
  totals.co2Kg += cups.length * 0.1;
  totals.plasticItems += cups.length;
  totals.packagingG += cups.length * 15;
  totals.co2Kg = Math.round(totals.co2Kg * 100) / 100;
  const s = streaks([...rows.map((r) => r.created_at), ...cups.map((r) => r.created_at)], new Date(), tz);
  return {
    userId,
    wallet: looksLikeWallet(ids[0]) ? ids[0] : null,
    totals,
    streak: s.current,
    longestStreak: s.longest,
    badges: badgesFor(totals, s.longest),
    places: (await query<{ id: string; name: string; impact_note: string | null; status: string }>("SELECT id,name,impact_note,status FROM stamp_places ORDER BY created_at, name")).filter((pl) => pl.status === "active" || rows.some((r) => r.place_id === pl.id)).map((pl) => { // hide paused places unless this passport has stamps from them
      const count = rows.filter((r) => r.place_id === pl.id).length;
      return { id: pl.id, name: pl.name, imageUrl: `/api/stamp-places/${pl.id}/stamp`, impactNote: pl.impact_note, earned: count > 0, count };
    }),
    anchored: rows.filter((r) => r.signature).length,
    nfts: (await listNfts(userId)).map((n) => ({ ...n, imageUrl: `/api/nft/${n.id}/image`, metadataUrl: `/api/nft/${n.id}/metadata` })),
    nextMilestone: nextMilestone(rows.length),
    registryUrl: (() => { const a = payerAddress(); return a ? addressUrl(a) : null; })(),
    records: rows.slice(0, 20).map((r) => ({
      id: r.id, placeId: r.place_id ?? null, source: r.source ?? null, merchant: r.merchant, co2Kg: r.co2_kg, plasticItems: r.plastic_items,
      verified: !!r.signature, signature: r.signature, createdAt: new Date(r.created_at).toISOString(),
    })),
  };
}
