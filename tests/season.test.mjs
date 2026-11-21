// Season 1 rules: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dueSlots, pickLucky, roomFor, SEASON_CARDS, SEASON_SUPPLY, seasonOnChainName, seasonOpen, soldOutRank } from "../lib/seasonRules.ts";

const full = Object.fromEntries(SEASON_CARDS.map((c) => [c.key, c.cap]));
const facts = (o = {}) => ({ points: 0, stampsAfterSummit: 0, ranksHeld: [], verifiedPurchases: 0, ...o });

test("20 designs, four per rank (two lucky, one explorer, one impact), 5,000 cards in all", () => {
  assert.equal(SEASON_CARDS.length, 20);
  assert.equal(SEASON_SUPPLY, 5000);
  for (const rank of ["sentinel", "warden", "guardian", "vanguard", "paragon"]) {
    const kinds = SEASON_CARDS.filter((c) => c.rank === rank).map((c) => c.kind).sort();
    assert.deepEqual(kinds, ["explorer", "impact", "lucky", "lucky"]);
  }
  assert.deepEqual(SEASON_CARDS.map((c) => c.code), Array.from({ length: 20 }, (_, i) => i + 1));
  for (const c of SEASON_CARDS) assert.ok(Buffer.byteLength(seasonOnChainName(c)) <= 32, c.name);
});

test("the board gives Explorer cards and draws at its fixed points", () => {
  assert.deepEqual(dueSlots(facts({ points: 4 })), []);
  assert.deepEqual(dueSlots(facts({ points: 5 })), [{ slot: "explorer:sentinel", design: "first_trail" }]);
  assert.deepEqual(dueSlots(facts({ points: 15 })).map((s) => s.design), ["first_trail", "four_corners"]);
  assert.deepEqual(dueSlots(facts({ points: 50 })).map((s) => s.slot), ["explorer:sentinel", "explorer:warden", "draw:24", "explorer:guardian", "draw:32", "explorer:vanguard", "draw:45"]);
  assert.deepEqual(dueSlots(facts({ points: 50 })).map((s) => s.design), ["first_trail", "four_corners", null, "river_crossing", null, "twelve_flags", null]);
  assert.deepEqual(dueSlots(facts({ points: 53 })).at(-1), { slot: "explorer:paragon", design: "world_walker" }); // the last tile of the board
});

test("Impact cards need the rank and a first verified purchase", () => {
  assert.deepEqual(dueSlots(facts({ verifiedPurchases: 9 })), []); // no rank, no card
  const s = dueSlots(facts({ ranksHeld: ["sentinel", "warden"], verifiedPurchases: 1 }));
  assert.deepEqual(s, [{ slot: "impact:sentinel", design: "first_proof" }, { slot: "impact:warden", design: "wrap_it" }]);
  assert.deepEqual(dueSlots(facts({ ranksHeld: ["sentinel", "paragon"] })), []); // no verified purchase, no Impact card
});

test("after the summit every 5th stamp is a draw", () => {
  assert.deepEqual(dueSlots(facts({ stampsAfterSummit: 4 })), []);
  assert.deepEqual(dueSlots(facts({ stampsAfterSummit: 11 })).map((s) => s.slot), ["scan:1", "scan:2"]);
});

test("the draw is weighted by what is left and skips owned and used-up designs", () => {
  const lucky = SEASON_CARDS.filter((c) => c.kind === "lucky").map((c) => c.key);
  assert.equal(pickLucky(full, new Set(), 0), "morning_cup");
  assert.equal(pickLucky(full, new Set(), 0.999999), "great_hive");
  assert.equal(pickLucky(full, new Set(["morning_cup"]), 0), "market_day");
  assert.equal(pickLucky({ ...full, morning_cup: 0 }, new Set(), 0), "market_day");
  assert.equal(pickLucky(full, new Set(lucky), 0.5), null);
  assert.equal(pickLucky({}, new Set(), 0.5), null);
  // only challenge designs never come out of a draw
  for (let i = 0; i < 200; i++) assert.ok(lucky.includes(pickLucky(full, new Set(), i / 200)));
  // weights: Sentinel's two lucky designs hold 1,300 of the 2,500 lucky cards, so just over half of the draws
  let sentinel = 0; for (let i = 0; i < 1000; i++) if (["morning_cup", "market_day"].includes(pickLucky(full, new Set(), i / 1000))) sentinel++;
  assert.equal(sentinel, 520);
});

test("the cap counts every card, the season ends after 12 months or when a rank is used up", () => {
  assert.equal(roomFor(5), 15); assert.equal(roomFor(20), 0); assert.equal(roomFor(23), 0);
  const start = new Date("2026-12-01T00:00:00Z");
  assert.equal(seasonOpen(null, new Date("2027-01-01T00:00:00Z"), full), false);
  assert.equal(seasonOpen(start, new Date("2026-11-30T00:00:00Z"), full), false);
  assert.equal(seasonOpen(start, new Date("2027-11-30T00:00:00Z"), full), true);
  assert.equal(seasonOpen(start, new Date("2027-12-01T00:00:00Z"), full), false);
  const gone = { ...full, golden_hour: 0, great_hive: 0, world_walker: 0, old_oak: 0 };
  assert.equal(soldOutRank(full), null); assert.equal(soldOutRank({ ...full, golden_hour: 0 }), null); assert.equal(soldOutRank(gone), "paragon");
  assert.equal(seasonOpen(start, new Date("2027-01-01T00:00:00Z"), gone), false);
});
