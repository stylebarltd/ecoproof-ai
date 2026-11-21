import { randomUUID } from "crypto";
import { query } from "./db";
import { identityGroup } from "./users";
import { stampDay } from "./stampPlaces";
import { tierFor, type RankKey } from "./milestoneRules";
import { TRAIL_END } from "./journeyMap";
import { pointsFor } from "./stampClasses";
import { dueSlots, pickLucky, roomFor, SEASON_CARDS, seasonCard, seasonOpen, type SeasonFacts } from "./seasonRules";

// Season 1 on the server: which cards a passport has earned, written as pending rows in nft_mints (the rank cards' table), where
// mintPending (lib/milestones.ts) mints them like any other card. The rules are lib/seasonRules.ts.
// The season is OFF until SEASON1_START is set (an ISO date, e.g. 2026-12-01): without it nothing is drawn or recorded.

/** When Season 1 starts, or null while it is switched off. */
export function seasonStart(): Date | null {
  const v = process.env.SEASON1_START;
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** How many of each design are left: its cap minus every card recorded for it (pending ones hold their place). */
export async function seasonRemaining(): Promise<Record<string, number>> {
  const rows = await query<{ design: string; n: number }>("SELECT design, COUNT(*)::int n FROM nft_mints WHERE design IS NOT NULL AND status <> 'merged' GROUP BY design");
  return Object.fromEntries(SEASON_CARDS.map((c) => [c.key, Math.max(0, c.cap - (rows.find((r) => r.design === c.key)?.n ?? 0))]));
}

async function factsFor(group: string[], points: number, held: { milestone: number; design: string | null; created_at: string }[]): Promise<SeasonFacts> {
  const rankRows = held.filter((h) => !h.design);
  const ranksHeld = [...new Set(rankRows.map((h) => tierFor(h.milestone).key))] as RankKey[];
  const recs = await query<{ id: string; source: string | null; place_id: string | null; place_kind: string | null; created_at: string }>(
    "SELECT r.id, r.source, r.place_id, p.kind AS place_kind, r.created_at FROM records r LEFT JOIN stamp_places p ON p.id = r.place_id WHERE r.user_id = ANY($1) ORDER BY r.created_at", [group]);
  const verified = recs.filter((r) => r.source === "order" || r.source === "receipt");
  // Stamps after the end of the board (Pola, 2026-11-19: the every-5th-stamp count starts after the last tile, 53): counted stamps
  // only (the first QR stamp per place per day, as in lib/passport.ts), collected once the points had reached TRAIL_END. The stamp
  // that reaches the last tile is not one of them.
  let stampsAfterSummit = 0, sum = 0;
  const seen = new Set<string>();
  for (const r of recs) {
    if (r.source === "qr" && r.place_id) { const k = `${r.place_id}:${stampDay(new Date(r.created_at))}`; if (seen.has(k)) continue; seen.add(k); }
    if (sum >= TRAIL_END) stampsAfterSummit++;
    sum += pointsFor(r.source, r.place_kind);
  }
  return {
    points, stampsAfterSummit, ranksHeld,
    verifiedPurchases: verified.length,
  };
}

/**
 * Records a pending Season card for every slot the passport has earned and not been served yet: the board's draws, the challenge
 * cards of the ranks it holds, the draws after the summit. Stops at the cap (rank cards count). Idempotent: one card per slot and
 * one of a design per owner (unique indexes), so two calls at once cannot give a card twice. Call after recordMilestones.
 */
export async function recordSeason(passportId: string, points: number, stats: object, rnd: () => number = Math.random): Promise<string[]> {
  const start = seasonStart();
  if (!start) return [];
  let remaining = await seasonRemaining();
  if (!seasonOpen(start, new Date(), remaining)) return [];
  const group = await identityGroup(passportId);
  const held = await query<{ milestone: number; design: string | null; slot: string | null; created_at: string }>(
    "SELECT milestone, design, slot, created_at FROM nft_mints WHERE owner_key = ANY($1) AND status <> 'merged'", [group]);
  // A person linked from several devices may hold one rank card per device until they are merged: count each rank and design once.
  const owned = new Set(held.filter((h) => h.design).map((h) => h.design!));
  const taken = new Set(held.filter((h) => h.slot).map((h) => h.slot!));
  let count = new Set(held.map((h) => h.design ?? `rank:${h.milestone}`)).size;
  const given: string[] = [];
  for (const s of dueSlots(await factsFor(group, points, held))) {
    if (roomFor(count) === 0) break;
    if (taken.has(s.slot)) continue;
    const design = s.design ?? pickLucky(remaining, owned, rnd());
    if (!design || owned.has(design) || (remaining[design] ?? 0) <= 0) continue; // nothing left for this slot (it stays open while the season runs)
    const card = seasonCard(design)!;
    const done = await query(
      "INSERT INTO nft_mints (id, owner_key, milestone, stats, design, slot) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING id",
      [randomUUID(), passportId, -card.code, JSON.stringify({ ...stats, milestone: -card.code, design, slot: s.slot }), design, s.slot]);
    if (!done.length) continue;
    owned.add(design); taken.add(s.slot); count++; given.push(design);
    remaining = { ...remaining, [design]: remaining[design] - 1 };
  }
  return given;
}
