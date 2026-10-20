// Star engine tests: `npm test`. Node runs lib/stars.ts directly (type stripping), against the real data/practices.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checklist, nextStar, practicesOf, rate } from "../lib/stars.ts";

const data = JSON.parse(readFileSync(new URL("../data/practices.json", import.meta.url), "utf8"));
const STAR_KINDS = ["cafe", "restaurant", "hotel"];
const all = (groups, status) => Object.fromEntries(practicesOf(groups).map((p) => [p.id, status]));

test("every place type with stars has 100 points and unique practice ids", () => {
  const ids = new Set();
  for (const kind of STAR_KINDS) {
    const items = practicesOf(checklist(data, kind));
    assert.equal(items.reduce((s, p) => s + p.points, 0), 100, kind);
    for (const p of items) { assert.ok(!ids.has(p.id), `duplicate id ${p.id}`); ids.add(p.id); }
  }
});

test("eco shops and online shops have no checklist", () => {
  assert.equal(checklist(data, "eco_shop"), null);
  assert.equal(checklist(data, "online_shop"), null);
  assert.equal(checklist(data, "nonsense"), null);
});

test("all yes = 5 stars", () => {
  for (const [kind, alsoCafe] of [...STAR_KINDS.map((k) => [k, false]), ["restaurant", true]]) {
    const groups = checklist(data, kind, alsoCafe);
    const r = rate(data, groups, all(groups, "yes"));
    assert.equal(r.score, 100, kind);
    assert.equal(r.stars, 5, kind);
  }
});

test("nothing ticked = Listed", () => {
  for (const kind of STAR_KINDS) {
    const r = rate(data, checklist(data, kind), {});
    assert.equal(r.stars, 0);
    assert.equal(r.label, "Listed");
    assert.equal(rate(data, checklist(data, kind), all(checklist(data, kind), "no")).label, "Listed");
  }
});

test("a café without takeaway (all takeaway items N/A) still reaches 5 stars when everything else is yes", () => {
  const groups = checklist(data, "cafe");
  const answers = all(groups, "yes");
  const takeaway = groups.find((g) => g.id === "takeaway").items;
  for (const p of takeaway) if (p.notApplicableAllowed) answers[p.id] = "not_applicable";
  const r = rate(data, groups, answers);
  assert.ok(r.applicablePoints < 100);
  assert.equal(r.score, 100);
  assert.equal(r.stars, 5);
});

test("N/A on a practice that doesn't allow it counts as no", () => {
  const groups = checklist(data, "cafe");
  const answers = all(groups, "yes");
  answers.cafe_dinein_reusable = "not_applicable"; // 12 points, N/A not allowed
  const r = rate(data, groups, answers);
  assert.equal(r.applicablePoints, 100);
  assert.equal(r.score, 88);
  assert.equal(r.stars, 5); // one big practice missing still leaves room for 5 stars (85+)
});

test("the score maps onto the scale in practices.json, rounding down", () => {
  const groups = checklist(data, "cafe");
  const yes = (...ids) => Object.fromEntries(ids.map((id) => [id, "yes"]));
  assert.equal(rate(data, groups, yes("cafe_dinein_reusable", "cafe_free_water")).label, "Listed"); // 19
  assert.equal(rate(data, groups, yes("cafe_dinein_reusable", "cafe_free_water", "cafe_no_receipt")).stars, 1); // 20
  // With N/A practices the score is a fraction: 84.x must stay 4.5 stars, not round up to 5.
  const answers = all(groups, "yes");
  answers.cafe_takeaway_cups = "not_applicable"; // applicable = 91
  answers.cafe_free_water = "no"; // yes = 84 of 91 = 92.3
  answers.cafe_no_receipt = "no"; answers.cafe_metal_spoons = "no"; answers.cafe_cup_deposit = "no"; // yes = 79 of 91 = 86.8
  answers.cafe_restroom_soap = "no"; // yes = 77 of 91 = 84.6
  assert.equal(rate(data, groups, answers).score, 84);
  assert.equal(rate(data, groups, answers).stars, 4.5);
});

test("the scale has half stars, covers 0 to 100 without gaps, and climbs in half-star steps", () => {
  const scale = data.stars.scale;
  assert.equal(scale[0].min, 0);
  assert.equal(scale.at(-1).max, 100);
  assert.equal(scale.at(-1).stars, 5);
  for (let i = 1; i < scale.length; i++) {
    assert.equal(scale[i].min, scale[i - 1].max + 1, `no gap before ${scale[i].stars} stars`);
    assert.equal(scale[i].stars, i === 1 ? 1 : scale[i - 1].stars + 0.5);
  }
});

test("a restaurant that is also a café adds the café serving practices, without duplicate labels", () => {
  const plain = practicesOf(checklist(data, "restaurant"));
  const both = practicesOf(checklist(data, "restaurant", true));
  const labels = both.map((p) => p.label.toLowerCase());
  assert.equal(new Set(labels).size, labels.length);
  assert.ok(both.length > plain.length);
  assert.ok(!both.some((p) => p.id === "cafe_no_plastic_water_bottles")); // same label as the restaurant's own
  assert.ok(both.some((p) => p.id === "cafe_plant_milk"));
});

test("next easiest star: the fewest open practices that reach it, and they really do", () => {
  const minFor = (stars) => data.stars.scale.find((x) => x.stars === stars).min;
  for (const kind of STAR_KINDS) {
    const groups = checklist(data, kind);
    let answers = {};
    for (;;) {
      const before = rate(data, groups, answers);
      const next = nextStar(data, groups, answers);
      if (before.stars === 5) { assert.equal(next, null, "nothing after 5 stars"); break; }
      const step = data.stars.scale.find((s) => s.stars > before.stars);
      assert.ok(next && next.stars === step.stars, `${kind} at ${before.stars} stars: next is the next step of the scale`);
      // One practice fewer can't get there, even taking the biggest open ones.
      const open = practicesOf(groups).filter((p) => answers[p.id] !== "yes").sort((a, b) => b.points - a.points);
      const fewer = open.slice(0, next.items.length - 1).reduce((s, p) => s + p.points, 0);
      assert.ok(Math.floor((100 * (before.yesPoints + fewer)) / before.applicablePoints) < minFor(next.stars), `${kind}: ${next.items.length} is the fewest`);
      answers = { ...answers, ...Object.fromEntries(next.items.map((p) => [p.id, "yes"])) };
      assert.ok(rate(data, groups, answers).stars >= next.stars, `${kind}: ticking the suggestion reaches ${next.stars} stars`);
    }
  }
});
