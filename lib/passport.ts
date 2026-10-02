import { query, type RecordRow } from "./db";

export type Totals = { receipts: number; co2Kg: number; plasticItems: number; packagingG: number; sustainableItems: number };
export type Badge = { id: string; icon: string; name: string; desc: string; earned: boolean };
export type Passport = {
  userId: string;
  totals: Totals;
  streak: number;
  longestStreak: number;
  badges: Badge[];
  records: { id: string; merchant: string; co2Kg: number; plasticItems: number; verified: boolean; createdAt: string }[];
};

const day = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
const DAY_MS = 86_400_000;

/** Consecutive UTC days with at least one receipt. Current streak stays alive if the last receipt was today or yesterday. */
export function streaks(dates: (Date | string)[], now = new Date()) {
  const days = [...new Set(dates.map(day))].sort();
  let longest = 0, run = 0, prev = 0;
  for (const d of days) {
    const t = Date.parse(d);
    run = prev && t - prev === DAY_MS ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = t;
  }
  const last = days.length ? Date.parse(days[days.length - 1]) : 0;
  const today = Date.parse(day(now));
  const current = last && today - last <= DAY_MS ? run : 0;
  return { current, longest };
}

export function badgesFor(t: Totals, longest: number): Badge[] {
  const list: [string, string, string, string, boolean][] = [
    ["first", "🌱", "First Proof", "Verify your first receipt", t.receipts >= 1],
    ["plastic", "♻️", "Plastic Fighter", "Avoid 100 single-use plastics", t.plasticItems >= 100],
    ["plastic500", "🐢", "Turtle Guardian", "Avoid 500 single-use plastics", t.plasticItems >= 500],
    ["carbon", "🌍", "Carbon Cutter", "Save 5 kg CO₂", t.co2Kg >= 5],
    ["carbon25", "🌳", "Forest Maker", "Save 25 kg CO₂", t.co2Kg >= 25],
    ["streak3", "🔥", "3-Day Streak", "Log impact 3 days in a row", longest >= 3],
    ["streak7", "⚡", "Week Warrior", "Log impact 7 days in a row", longest >= 7],
    ["five", "🏅", "Regular", "Verify 5 receipts", t.receipts >= 5],
  ];
  return list.map(([id, icon, name, desc, earned]) => ({ id, icon, name, desc, earned }));
}

export async function getPassport(userId: string): Promise<Passport> {
  const rows = await query<RecordRow>("SELECT * FROM records WHERE user_id=$1 ORDER BY created_at DESC", [userId]);
  const totals: Totals = { receipts: rows.length, co2Kg: 0, plasticItems: 0, packagingG: 0, sustainableItems: 0 };
  for (const r of rows) {
    totals.co2Kg += r.co2_kg ?? 0;
    totals.plasticItems += r.plastic_items ?? 0;
    totals.packagingG += r.packaging_g ?? 0;
    totals.sustainableItems += r.sustainable_items ?? 0;
  }
  totals.co2Kg = Math.round(totals.co2Kg * 100) / 100;
  const s = streaks(rows.map((r) => r.created_at));
  return {
    userId,
    totals,
    streak: s.current,
    longestStreak: s.longest,
    badges: badgesFor(totals, s.longest),
    records: rows.slice(0, 20).map((r) => ({
      id: r.id, merchant: r.merchant, co2Kg: r.co2_kg, plasticItems: r.plastic_items,
      verified: !!r.signature, createdAt: new Date(r.created_at).toISOString(),
    })),
  };
}
