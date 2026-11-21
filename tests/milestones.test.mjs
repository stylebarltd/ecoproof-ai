// Rank and point rules: `npm test`. Ranks at 1 / 10 / 20 / 35 / 50 points (2026-11-20), points by kind of place (2026-11-18).
import { test } from "node:test";
import assert from "node:assert/strict";
import { editionOf, nextMilestone, RANKS, reachedMilestones, tierFor } from "../lib/milestoneRules.ts";
import { POINTS_BY_KIND, POINTS_CARD, POINTS_VERIFIED, pointsFor } from "../lib/stampClasses.ts";
import { progress } from "../lib/passportView.ts";

test("ranks start at 1, 10, 20, 35 and 50 points", () => {
  assert.deepEqual(RANKS.map((r) => [r.name, r.at]), [["Sentinel", 1], ["Warden", 10], ["Guardian", 20], ["Vanguard", 35], ["Paragon", 50]]);
});
test("milestones reached", () => {
  assert.deepEqual(reachedMilestones(0), []);
  assert.deepEqual(reachedMilestones(9), [1]);
  assert.deepEqual(reachedMilestones(10), [1, 10]);
  assert.deepEqual(reachedMilestones(34), [1, 10, 20]);
  assert.deepEqual(reachedMilestones(500), [1, 10, 20, 35, 50]); // nothing more by points after Paragon
});
test("next milestone, and the summit once Paragon is reached", () => {
  assert.equal(nextMilestone(0), 1);
  assert.equal(nextMilestone(1), 10);
  assert.equal(nextMilestone(17), 20);
  assert.equal(nextMilestone(49), 50);
  assert.equal(nextMilestone(50), 50);
  assert.equal(nextMilestone(999), 50);
});
test("a milestone number reads as its rank; old Paragon editions keep counting", () => {
  assert.deepEqual([1, 10, 20, 35, 50, 100, 150].map((m) => tierFor(m).key), ["sentinel", "warden", "guardian", "vanguard", "paragon", "paragon", "paragon"]);
  assert.deepEqual([1, 35, 50, 100, 150].map(editionOf), [1, 1, 1, 2, 3]);
});
test("points: a visit 1 everywhere, a parcel card 3, a verified purchase 5", () => {
  assert.deepEqual(POINTS_BY_KIND, { cafe: 1, restaurant: 1, hotel: 1, eco_shop: 1 });
  assert.equal(pointsFor("qr", "restaurant"), 1);
  assert.equal(pointsFor("qr", "hotel"), 1);
  assert.equal(pointsFor("qr", "eco_shop"), 1);
  assert.equal(pointsFor("card", "eco_shop"), POINTS_CARD);
  assert.equal(POINTS_CARD, 3);
  assert.equal(pointsFor("order", "cafe"), POINTS_VERIFIED);
  assert.equal(pointsFor("receipt", "hotel"), 5);
});
test("progress text: on the way, and at the summit", () => {
  const p = progress(17, nextMilestone(17));
  assert.equal(p.nextTier, "Guardian");
  assert.equal(p.toGo, 3);
  assert.equal(p.text, "17 points · 3 to Guardian");
  const top = progress(130, nextMilestone(130));
  assert.equal(top.toGo, 0);
  assert.equal(top.fraction, 1);
  assert.equal(top.text, "130 points · Paragon reached");
});
