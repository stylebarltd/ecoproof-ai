// Journey map layout tests: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BOARD_LAND, BOARD_PORT, DRAW_AT, EXPLORER_AT, layoutJourney, stepOf, TERRAIN, TRAIL_END } from "../lib/journeyMap.ts";

// The layout follows whatever ranks it is given. The code's own are 1 / 10 / 20 / 35 / 50 (2026-11-20); OTHER_RANKS is a longer ladder (the 1 / 5 / 20 / 50 / 120 once planned).
const OTHER_RANKS = [["sentinel", "Sentinel", 1, 1], ["warden", "Warden", 2, 5], ["guardian", "Guardian", 3, 20], ["vanguard", "Vanguard", 4, 50], ["paragon", "Paragon", 5, 120]]
  .map(([key, name, tier, at]) => ({ key, name, tier, at }));
// Both boards (landscape for desktop, portrait for phones), each with the code's ranks and with the other ladder.
const shapes = [{ name: "portrait", board: BOARD_PORT }, { name: "landscape", board: BOARD_LAND }, { name: "portrait", board: BOARD_PORT, ranks: OTHER_RANKS }, { name: "landscape", board: BOARD_LAND, ranks: OTHER_RANKS }];
const lay = (s) => layoutJourney(s.board, s.ranks);

for (const s of shapes) {
  const title = `${s.name} board to ${s.ranks ? 120 : 53}`;
  test(`${title}: one node per point, evenly spaced, the last at the end of the trail`, () => {
    const j = lay(s);
    assert.equal(j.nodes.length, j.end + 1);
    assert.equal(j.end, s.ranks ? 120 : TRAIL_END);
    assert.equal(TRAIL_END, 53);
    j.nodes.forEach((p, i) => assert.equal(p.n, i));
    for (let i = 1; i < j.nodes.length; i++) {
      const d = Math.hypot(j.nodes[i].x - j.nodes[i - 1].x, j.nodes[i].y - j.nodes[i - 1].y);
      assert.ok(Math.abs(d - j.spacing) < 1e-6, `step ${i} is ${d} from the one before, expected ${j.spacing}`);
      assert.ok(j.nodes[i].len > j.nodes[i - 1].len, "the road only runs forward");
    }
    assert.equal(j.total, j.nodes[j.end].len);
    assert.ok(j.nodes[j.end].y < j.nodes[0].y, "the trail climbs: it ends above its start");
  });
  test(`${title}: everything stays inside the drawing`, () => {
    const j = lay(s);
    assert.equal(j.width, s.board.width); assert.equal(j.height, s.board.height);
    for (const p of j.nodes) assert.ok(p.x - j.station / 2 >= 0 && p.x + j.station / 2 <= j.width && p.y - j.station / 2 >= 0 && p.y + j.station / 2 <= j.height);
    for (const r of j.stations) assert.ok(r.y + j.station / 2 + 30 <= j.height, `the ${r.name} label runs off the board`);
    for (const l of j.landmarks) assert.ok(l.x - l.size / 2 >= 0 && l.x + l.size / 2 <= j.width && l.y - l.size / 2 >= 0 && l.y + l.size / 2 <= j.height);
  });
  test(`${title}: a stone is small, a station is wider than a card tile and clears its neighbour`, () => {
    const j = lay(s);
    assert.ok(j.tile < j.spot && j.spot < j.station);
    assert.ok(j.station / 2 + j.tile / 2 <= j.spacing, "station overlaps the next stone on the trail");
  });
  test(`${title}: landmarks and decoration stand clear of the trail`, () => {
    const j = lay(s);
    const size = (p) => (j.stations.some((r) => r.at === p.n) ? j.station : [...j.draws, ...j.explorers].some((d) => d.n === p.n) || p.n === 0 ? j.spot : j.tile);
    for (const l of j.landmarks) for (const p of j.nodes) assert.ok(Math.hypot(l.x - p.x, l.y - p.y) >= l.size / 2 + size(p) / 2, `the ${l.key} landmark covers point ${p.n}`);
    for (const d of j.decor.filter((d) => d.kind !== "wave")) for (const p of j.nodes) assert.ok(Math.hypot(d.x - p.x, d.y - p.y) >= d.s / 2 + size(p) / 2, `a ${d.kind} covers point ${p.n}`);
    for (const l of j.landmarks) assert.equal(l.terrain, TERRAIN[l.key]);
    assert.deepEqual(lay(s).decor, j.decor, "the same board on every visit");
  });
}

test("with the code's ranks every area has its landmark on both boards", () => {
  for (const b of [BOARD_LAND, BOARD_PORT]) assert.deepEqual(layoutJourney(b).landmarks.map((l) => l.key), ["sentinel", "warden", "guardian", "vanguard", "paragon"]);
});

test("areas follow the ranks and cover steps 1 to the summit without gaps", () => {
  const j = lay(shapes[0]);
  assert.deepEqual(j.stations.map((s) => s.at), [1, 10, 20, 35, 50]);
  assert.deepEqual(j.areas.map((a) => [a.at, a.to]), [[1, 9], [10, 19], [20, 34], [35, 49], [50, 53]]);
});

test("with another ladder the stations and areas move with it", () => {
  const j = lay(shapes[2]);
  assert.deepEqual(j.stations.map((s) => s.at), [1, 5, 20, 50, 120]);
  assert.deepEqual(j.areas.map((a) => [a.at, a.to]), [[1, 4], [5, 19], [20, 49], [50, 119], [120, 120]]);
});

test("random cards are drawn at fixed spots, never on top of a rank station", () => {
  assert.deepEqual([...DRAW_AT], [24, 32, 45]);
  assert.deepEqual(lay(shapes[0]).draws.map((d) => d.n), [24, 32, 45]);
  const moved = layoutJourney(BOARD_PORT, OTHER_RANKS.map((r) => (r.key === "guardian" ? { ...r, at: 24 } : r))); // a rank on a draw spot wins it
  assert.deepEqual(moved.draws.map((d) => d.n), [32, 45]);
});

test("Explorer cards have fixed spots too, each in its rank's area", () => {
  assert.deepEqual([...EXPLORER_AT], [5, 15, 28, 40, 53]);
  assert.deepEqual(lay(shapes[0]).explorers.map((e) => [e.n, e.rank]), [[5, "sentinel"], [15, "warden"], [28, "guardian"], [40, "vanguard"], [53, "paragon"]]);
});

test("the bee never walks past the summit or before the start", () => {
  assert.equal(stepOf(0), 0);
  assert.equal(stepOf(12), 12);
  assert.equal(stepOf(51), 51);
  assert.equal(stepOf(60), TRAIL_END);
  assert.equal(stepOf(121, 120), 120);
  assert.equal(stepOf(-3), 0);
});
