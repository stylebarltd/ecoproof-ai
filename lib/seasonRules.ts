// Season 1 rules (Pola, 2026-11-18/19): the 20 special Bee Guardian cards on top of the five rank cards. Pure (no server imports), so
// `npm test` can check it and client components can read the card list. The server side is lib/season.ts.
//  - 20 designs, four per rank: two "lucky" ones that only a random draw gives, and two challenge ones (Explorer and Impact) that
//    only a holder of that rank can earn (Explorer: by reaching its spot on the board, EXPLORER_AT; Impact: a first verified purchase). Supply 5,000 as a pyramid: 650 / 325 / 160 / 75 / 40 per design.
//  - A random card is drawn at fixed points on the board (DRAW_AT) and on every 5th stamp after the last tile of the board (53).
//    The draw is weighted by what is left of each lucky design and never gives a design the person already owns.
//  - One passport holds at most MAX_NFTS cards, the five rank cards included. Cards are soulbound like the rank cards.
//  - The season runs 12 months from its start, or until one rank's four designs are all used up, whichever comes first.
import { AFTER_SUMMIT_EVERY_SCAN, DRAW_AT, EXPLORER_AT, MAX_NFTS, rankAreaOf } from "./journeyMap.ts";
import { RANKS, type RankKey } from "./milestoneRules.ts";

export type SeasonKind = "lucky" | "explorer" | "impact";
export type SeasonCard = { key: string; name: string; rank: RankKey; kind: SeasonKind; cap: number; /** its number in nft_mints.milestone is -code: never renumber */ code: number };

export const SEASON = 1;
export const SEASON_MONTHS = 12;
const CAP: Record<RankKey, number> = { sentinel: 650, warden: 325, guardian: 160, vanguard: 75, paragon: 40 };
// The order is the cards' identity in the database (code = position + 1): only ever append.
const LIST: [string, string, RankKey, SeasonKind][] = [
  ["morning_cup", "Morning Cup", "sentinel", "lucky"], ["market_day", "Market Day", "sentinel", "lucky"], ["first_trail", "First Trail", "sentinel", "explorer"], ["first_proof", "First Proof", "sentinel", "impact"],
  ["refill_round", "Refill Round", "warden", "lucky"], ["rain_patrol", "Rain Patrol", "warden", "lucky"], ["four_corners", "Four Corners", "warden", "explorer"], ["wrap_it", "Wrap It", "warden", "impact"],
  ["hive_workshop", "Hive Workshop", "guardian", "lucky"], ["night_watch", "Night Watch", "guardian", "lucky"], ["river_crossing", "River Crossing", "guardian", "explorer"], ["kilo_keeper", "Kilo Keeper", "guardian", "impact"],
  ["mountain_pass", "Mountain Pass", "vanguard", "lucky"], ["storm_flight", "Storm Flight", "vanguard", "lucky"], ["twelve_flags", "Twelve Flags", "vanguard", "explorer"], ["clean_shore", "Clean Shore", "vanguard", "impact"],
  ["golden_hour", "Golden Hour", "paragon", "lucky"], ["great_hive", "The Great Hive", "paragon", "lucky"], ["world_walker", "World Walker", "paragon", "explorer"], ["old_oak", "Old Oak", "paragon", "impact"],
];
export const SEASON_CARDS: readonly SeasonCard[] = LIST.map(([key, name, rank, kind], i) => ({ key, name, rank, kind, cap: CAP[rank], code: i + 1 }));
export const seasonCard = (key: string) => SEASON_CARDS.find((c) => c.key === key);
export const SEASON_SUPPLY = SEASON_CARDS.reduce((n, c) => n + c.cap, 0);

// Explorer (Pola, 2026-11-19): given at fixed points on the board (EXPLORER_AT in lib/journeyMap.ts), the design of the rank area the
// point lies in; reaching the point means holding that rank. Paragon's Explorer card (World Walker) is the last tile, at 53.
// Impact (Pola, 2026-11-19): a first verified purchase is enough at every rank; the rank itself is the only other condition.
export const seasonCardOf = (rank: RankKey, kind: SeasonKind) => SEASON_CARDS.find((c) => c.rank === rank && c.kind === kind)!;

/** Full-quality artwork (the NFT image) and a 512px copy for pages. Static files in public/nft/season1 (art/season1/export.py). */
export const seasonImage = (key: string) => `/nft/season1/${key}.png`;
export const seasonWebp = (key: string) => `/nft/season1/web/${key}.webp`;
export const seasonNftName = (c: SeasonCard) => `${c.name} · EcoProof Season ${SEASON}`;
/** On chain: at most 32 bytes, plain ASCII (as onChainName in milestoneRules). The longest, "The Great Hive - EcoProof S1", is 28. */
export const seasonOnChainName = (c: SeasonCard) => `${c.name} - EcoProof S${SEASON}`;

export type SeasonFacts = {
  points: number;
  /** counted stamps collected after the last tile of the board (TRAIL_END, 53 points) was reached */
  stampsAfterSummit: number;
  ranksHeld: RankKey[];
  verifiedPurchases: number;
};
/** A reason to get a card. `slot` is its identity (one card per slot per person); a lucky slot has no design yet: it is drawn. */
export type SeasonSlot = { slot: string; design: string | null };

/** Every slot the facts have earned, in the order they are served: the board's spots along the trail (Explorer cards and draws), then the Impact cards, then the draws after the summit. */
export function dueSlots(f: SeasonFacts): SeasonSlot[] {
  const rankAt = new Set(RANKS.map((r) => r.at)); // a rank station wins its spot, as on the board
  const out: SeasonSlot[] = [...new Set([...EXPLORER_AT, ...DRAW_AT])].filter((n) => n <= f.points && !rankAt.has(n)).sort((a, b) => a - b).flatMap((n): SeasonSlot[] => {
    if (DRAW_AT.includes(n)) return [{ slot: `draw:${n}`, design: null }];
    const rank = rankAreaOf(n);
    return rank ? [{ slot: `explorer:${rank}`, design: seasonCardOf(rank, "explorer").key }] : [];
  });
  if (f.verifiedPurchases >= 1) for (const r of RANKS) if (f.ranksHeld.includes(r.key)) out.push({ slot: `impact:${r.key}`, design: seasonCardOf(r.key, "impact").key });
  for (let k = 1; k <= Math.floor(f.stampsAfterSummit / AFTER_SUMMIT_EVERY_SCAN); k++) out.push({ slot: `scan:${k}`, design: null });
  return out;
}

/** The random draw: one lucky design the person does not own, weighted by how many of it are left. `rnd` in [0, 1). Null when nothing is left for them. */
export function pickLucky(remaining: Record<string, number>, owned: ReadonlySet<string>, rnd: number): string | null {
  const pool = SEASON_CARDS.filter((c) => c.kind === "lucky" && !owned.has(c.key) && (remaining[c.key] ?? 0) > 0);
  const total = pool.reduce((n, c) => n + remaining[c.key], 0);
  if (!total) return null;
  let at = Math.min(Math.max(rnd, 0), 0.999999999) * total;
  for (const c of pool) { at -= remaining[c.key]; if (at < 0) return c.key; }
  return pool[pool.length - 1].key;
}

/** How many more cards fit under the cap, given how many the passport holds (rank cards included). */
export const roomFor = (held: number) => Math.max(0, MAX_NFTS - held);

/** A rank whose four designs are all used up ends the season. */
export const soldOutRank = (remaining: Record<string, number>): RankKey | null =>
  RANKS.find((r) => SEASON_CARDS.filter((c) => c.rank === r.key).every((c) => (remaining[c.key] ?? 0) <= 0))?.key ?? null;

/** Is the season handing out cards at `now`? `start` null: not started. */
export function seasonOpen(start: Date | null, now: Date, remaining: Record<string, number>): boolean {
  if (!start || now < start) return false;
  const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + SEASON_MONTHS);
  return now < end && !soldOutRank(remaining);
}
