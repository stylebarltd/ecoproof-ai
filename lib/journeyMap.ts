// Layout of the passport's journey map (components/PassportMap.tsx). Pure: no React, no DOM, so `npm test` can check it.
// The map is an illustrated game board (Pola, 2026-11-20): a green land drawn in SVG, with one trail winding up it from the hive
// village to the summit. One node per point, 0 (Start) to `end`; every node is exactly `spacing` from the one before, so the
// stones sit evenly however the trail bends. Two boards from the same code: a landscape one (BOARD_LAND) and a portrait one for
// phones (BOARD_PORT). The ground follows the trail: each rank's area is the land around its part of the trail, so a threshold
// change in lib/milestoneRules.ts moves the regions, the landmarks and the decoration by itself.
import { RANKS, type RankKey, type Tier } from "./milestoneRules.ts";

/** The last numbered step with the ranks in the code today: Paragon is reached here. Past it the map only notes the next Paragon edition. Every number comes from the ranks, so the trail follows any threshold change in lib/milestoneRules.ts. */
const BOARD_LAST = 53; // the last board spot: Paragon's Explorer card, three points past the summit (Pola, 2026-11-19)
export const TRAIL_END = Math.max(RANKS[RANKS.length - 1].at, BOARD_LAST);

/** The rank rim colours of the Bee Guardian cards (RANK_COLOUR in lib/beeCardOg.tsx, which can't be imported into client code), used as the tint of each rank's area. */
export const AREA_COLOUR: Record<RankKey, string> = { sentinel: "#A9825A", warden: "#B4703C", guardian: "#6F6B66", vanguard: "#B98535", paragon: "#D9A63A" };

export type JourneyNode = { n: number; x: number; y: number; len: number };
export type JourneyArea = { key: RankKey; name: string; at: number; to: number; d: string };
/** The points where a random Season card is drawn: fixed spots on the board (Pola, 2026-11-19; they replaced "every 8 points").
 *  Moved on 2026-11-20 together with the ranks (1 / 10 / 20 / 35 / 50), so a card comes about every 4 to 5 points: 1, 5, 10, 15, 20, 24, 28, 32, 35, 40, 45, 50, 53. */
export const DRAW_AT: readonly number[] = [24, 32, 45];
/** The points where an Explorer card is given (Pola, 2026-11-19: Explorer cards are board spots, not "so many different places"):
 *  the Explorer design of the rank area the point lies in. Paragon's (World Walker) is the last tile of the board, past the Paragon station. */
export const EXPLORER_AT: readonly number[] = [5, 15, 28, 40, BOARD_LAST];
/** The rank whose area point `n` lies in (null before the first rank). */
export const rankAreaOf = (n: number, ranks: readonly Tier[] = RANKS): RankKey | null => [...ranks].reverse().find((r) => r.at <= n)?.key ?? null;

/** After Paragon, every this many stamps gives a random NFT, and one passport holds at most MAX_NFTS, the five rank cards included (Pola, 2026-11-19; not built yet). */
export const AFTER_SUMMIT_EVERY_SCAN = 5;
export const MAX_NFTS = 20;

export type JourneyStation = { key: RankKey; name: string; at: number; x: number; y: number };
/** What the land of each rank's area is: the trail climbs from the hive village to the summit. */
export const TERRAIN: Record<RankKey, "meadow" | "forest" | "shore" | "hills" | "summit"> = { sentinel: "meadow", warden: "forest", guardian: "hills", vanguard: "shore", paragon: "summit" }; // hills before shore since 2026-11-20: with the ranks at 1 / 10 / 20 / 35 / 50 the Vanguard area is the one at the coast
export type Terrain = (typeof TERRAIN)[RankKey];
export type DecorKind = "flower" | "tuft" | "hive" | "tree" | "bush" | "palm" | "parasol" | "shell" | "terrace" | "field" | "rock" | "pine" | "snow" | "wave";
/** A small drawing on the ground: `s` is its size, `r` a number 0..1 that picks its variant (colour, mirror), fixed per board. */
export type Decor = { x: number; y: number; kind: DecorKind; s: number; r: number };
/** The free spot with the most room in a rank's area, where its landmark (a painted picture) stands. */
export type Landmark = { key: RankKey; terrain: Terrain; x: number; y: number; size: number };
export type Journey = {
  /** The last point on the trail: the last rank's station or the last board spot, whichever is further. */
  end: number; width: number; height: number; spacing: number;
  /** Sizes: `tile` a plain point's stepping stone (small: it carries nothing), `spot` a gift or compass tile, `station` a rank's frame. */
  tile: number; spot: number; station: number;
  /** The width of the strip of land around the trail. */
  land: number;
  /** `len` is the length of the road from Start to the node, along the drawn curve. */
  nodes: JourneyNode[]; road: string; total: number; areas: JourneyArea[]; stations: JourneyStation[];
  /** Where a random card is drawn: the `DRAW_AT` spots on this trail, except where a rank station already stands. */
  draws: JourneyNode[];
  /** Where an Explorer card is given: the `EXPLORER_AT` spots, with the rank whose Explorer design it is; a rank station wins its spot. */
  explorers: (JourneyNode & { rank: RankKey })[];
  landmarks: Landmark[]; decor: Decor[];
};

/** A board: its size, how many times the trail crosses it (`passes`), and the room kept at the edges. */
export type Board = { width: number; height: number; passes: number; margin: number; top: number; bottom: number };
export const BOARD_LAND: Board = { width: 1000, height: 560, passes: 3, margin: 74, top: 96, bottom: 92 };
export const BOARD_PORT: Board = { width: 320, height: 740, passes: 7, margin: 42, top: 78, bottom: 74 };

type Pt = { x: number; y: number };
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** The trail as a dense line: it starts at the lower left, crosses the board `passes` times with a round turn at each end, and ends at the top. Each crossing sways a little, so it reads as a path, not a grid. */
function curve({ width, height, passes, margin, top, bottom }: Board): Pt[] {
  const gap = (height - top - bottom) / (passes - 1), R = gap / 2, xl = margin, xr = width - margin, pts: Pt[] = [];
  for (let i = 0; i < passes; i++) {
    const y = height - bottom - i * gap, ltr = i % 2 === 0;
    const from = ltr ? (i === 0 ? xl : xl + R) : xr - R, to = ltr ? (i === passes - 1 ? xr : xr - R) : (i === passes - 1 ? xl : xl + R);
    const n = Math.max(8, Math.round(Math.abs(to - from) / 3));
    for (let k = 0; k <= n; k++) { const u = k / n; pts.push({ x: from + (to - from) * u, y: y + (ltr ? -1 : 1) * gap * 0.1 * Math.sin(2 * Math.PI * u) * Math.sin(Math.PI * u) }); }
    if (i < passes - 1) { // the turn up to the next crossing: half a circle around a point between the two
      const cx = ltr ? xr - R : xl + R, cy = y - R, m = Math.max(8, Math.round((Math.PI * R) / 3));
      for (let k = 1; k < m; k++) { const a = Math.PI / 2 - (ltr ? 1 : -1) * Math.PI * (k / m); pts.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }); }
    }
  }
  return pts.map((p) => ({ x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 })); // sin and cos may differ in the last digit between the server and a browser: rounded, both lay out the same board
}

/** `steps` points along the line, each exactly `s` from the one before (straight-line distance), starting at its first point; null when the line is too short for that. */
function march(line: Pt[], steps: number, s: number): (Pt & { len: number })[] | null {
  const cum = [0]; for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + dist(line[i], line[i - 1]));
  const out = [{ ...line[0], len: 0 }]; let cur: Pt = line[0], seg = 0;
  for (let n = 1; n <= steps; n++) {
    let k = seg; while (k < line.length - 1 && dist(line[k + 1], cur) < s) k++;
    if (k >= line.length - 1) return null;
    const a = line[k], b = line[k + 1], dx = b.x - a.x, dy = b.y - a.y, fx = a.x - cur.x, fy = a.y - cur.y; // where the segment a-b leaves the circle of radius s around cur
    const A = dx * dx + dy * dy, B = 2 * (fx * dx + fy * dy), C = fx * fx + fy * fy - s * s, t = (-B + Math.sqrt(Math.max(0, B * B - 4 * A * C))) / (2 * A);
    cur = { x: a.x + dx * t, y: a.y + dy * t }; seg = k; out.push({ ...cur, len: cum[k] + Math.sqrt(A) * t });
  }
  return out;
}

/** A small repeatable random number source, so a board looks the same on every visit and on the server. */
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** What grows or stands on each kind of land, with how often (weight) and how large (as a share of a spot tile). */
const DECOR: Record<Terrain, [DecorKind, number, number][]> = {
  meadow: [["flower", 4, 0.36], ["tuft", 2, 0.3], ["hive", 4, 0.66], ["bush", 1, 0.4]],
  forest: [["tree", 8, 0.78], ["bush", 1, 0.42], ["tuft", 1, 0.3]],
  shore: [["palm", 6, 0.8], ["parasol", 1, 0.46], ["shell", 1, 0.24], ["tuft", 1, 0.28]],
  hills: [["terrace", 4, 0.86], ["field", 3, 0.62], ["bush", 1, 0.4], ["tree", 2, 0.66]],
  summit: [["rock", 3, 0.52], ["pine", 4, 0.7], ["snow", 2, 0.6]],
};

/** The board `board` with the trail for the given ranks (the code's own by default; tests pass others). */
export function layoutJourney(board: Board, ranks: readonly Tier[] = RANKS): Journey {
  const { width, height, passes, top, bottom } = board;
  const end = Math.max(ranks[ranks.length - 1].at, ...EXPLORER_AT, ...DRAW_AT); // the trail runs to the last rank or the last board spot, whichever is further
  const line = curve(board), gap = (height - top - bottom) / (passes - 1);
  let lo = 1, hi = width; // the largest step with which `end` steps still fit on the trail: the last node then stands at its end
  for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (march(line, end, mid)) lo = mid; else hi = mid; }
  const spacing = lo, nodes: JourneyNode[] = march(line, end, spacing)!.map((p, n) => ({ n, x: p.x, y: p.y, len: p.len }));
  const tile = Math.round(spacing * 0.5), spot = Math.round(spacing * 0.8);
  const station = Math.min(64, Math.round(spacing * 1.2)); // wider than a tile, still clear of the next stone on the trail
  const land = gap * 1.12;
  const poly = (from: number, to: number) => nodes.slice(from, to + 1).map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areas = ranks.map((r, i) => {
    const to = (ranks[i + 1]?.at ?? end + 1) - 1;
    return { key: r.key, name: r.name, at: r.at, to, d: poly(Math.max(0, r.at - 1), to) }; // from the node before, so the areas join (and the first holds Start)
  });
  const stations = ranks.map((r) => ({ key: r.key, name: r.name, at: r.at, x: nodes[r.at].x, y: nodes[r.at].y }));
  const rankAt = new Set(ranks.map((r) => r.at));
  const draws = nodes.filter((p) => DRAW_AT.includes(p.n) && !rankAt.has(p.n));
  const explorers = nodes.filter((p) => EXPLORER_AT.includes(p.n) && !rankAt.has(p.n) && rankAreaOf(p.n, ranks)).map((p) => ({ ...p, rank: rankAreaOf(p.n, ranks)! }));

  // How much room each node needs around its centre: a station with its two lines of label, a spot tile, or a stone.
  const spots = new Set([...draws, ...explorers].map((p) => p.n));
  const need = nodes.map((p) => (rankAt.has(p.n) ? station / 2 + 30 : spots.has(p.n) || p.n === 0 ? spot / 2 + 6 : tile / 2 + 4));
  const areaOf = (n: number) => rankAreaOf(Math.max(n, ranks[0].at), ranks)!;
  const room = (q: Pt) => { let best = Infinity, at = 0, near = Infinity; nodes.forEach((p, i) => { const d = dist(p, q); if (d < near) { near = d; at = i; } best = Math.min(best, d - need[i]); }); return { free: best, near, area: areaOf(at) }; };

  // One landmark per area: the spot on its land that is furthest from every stone and station.
  const landmarks: Landmark[] = [];
  for (const r of ranks) {
    let pick: Landmark | null = null;
    for (let y = 20; y <= height - 20; y += 6) for (let x = 20; x <= width - 20; x += 6) {
      const { free, near, area } = room({ x, y });
      if (area !== r.key || near > land / 2 - 8) continue;
      const others = Math.min(...landmarks.map((l) => dist(l, { x, y }) - l.size / 2 - 4), Infinity); // clear of the landmarks already placed
      const size = Math.min(2 * free, 2 * others, 2 * Math.min(x, y, width - x, height - y));
      if (!pick || size > pick.size) pick = { key: r.key, terrain: TERRAIN[r.key], x, y, size };
    }
    if (pick && pick.size >= spot) landmarks.push({ ...pick, size: Math.min(pick.size, station * 1.7) });
  }

  // Decoration: scattered where nothing else is, each kind on its own land; waves on the sea around it.
  const rand = rng(20261120 + passes), decor: Decor[] = [];
  for (let i = 0; i < 2600; i++) {
    const q = { x: 6 + rand() * (width - 12), y: 6 + rand() * (height - 12) }, { free, near, area } = room(q), r = rand(), w = rand();
    const sea = near > land / 2 + spot * 0.5;
    if (!sea && near > land / 2 - spot * 0.45) continue; // the rim of the land stays clear
    const kinds = DECOR[TERRAIN[area]], sum = kinds.reduce((a, k) => a + k[1], 0);
    let pickKind = kinds[0]; for (let acc = 0, j = 0; j < kinds.length; j++) { acc += kinds[j][1]; if (w * sum < acc) { pickKind = kinds[j]; break; } }
    const kind: DecorKind = sea ? "wave" : pickKind[0], s = Math.round(spot * (sea ? 0.5 : pickKind[2]) * (0.85 + 0.3 * r));
    if (!sea && free < s / 2 + 2) continue;
    if (landmarks.some((l) => dist(l, q) < l.size / 2 + s / 2 + 2) || decor.some((d) => dist(d, q) < (d.s + s) * (sea ? 1.4 : 0.5) + spot * 0.35)) continue;
    decor.push({ x: Math.round(q.x * 10) / 10, y: Math.round(q.y * 10) / 10, kind, s, r });
  }
  decor.sort((a, b) => a.y - b.y); // what stands lower on the board is drawn over what stands higher

  const road = line.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return { end, width, height, spacing, tile, spot, station, land, nodes, road, total: nodes[end].len, areas, stations, draws, explorers, landmarks, decor };
}

/** The point the bee stands on: the points earned, but never past the end of the trail. */
export const stepOf = (points: number, end = TRAIL_END) => Math.min(end, Math.max(0, Math.floor(points)));
