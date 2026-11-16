// Receipt line matching, the text part: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { bestFuzzy, exactKey, similarity, tokens } from "../lib/matchText.ts";

test("exact keys ignore case and spacing only", () => {
  assert.equal(exactKey("  Beeswax   WRAP "), "beeswax wrap");
  assert.notEqual(exactKey("Beeswax wrap 250g"), exactKey("Beeswax wrap"));
});

test("tokens drop numbers, units and punctuation", () => {
  assert.deepEqual(tokens("BEESWAX WRAP 3PK 250G"), ["beeswax", "wrap"]);
  assert.deepEqual(tokens("Shampoo bar, 1.5 oz x2"), ["shampoo", "bar"]);
  assert.deepEqual(tokens("Laundry soap 1 l"), ["laundry", "soap"]);
  assert.deepEqual(tokens("Lip balm"), ["lip", "balm"]); // "l" inside a word is not a unit
  assert.deepEqual(tokens("สบู่ก้อน 100 กรัม"), ["สบู่ก้อน"]);
  assert.deepEqual(tokens("250 g"), []);
});

test("similarity is word overlap", () => {
  assert.equal(similarity("BEESWAX WRAP 250G", "Beeswax wrap"), 1);
  assert.equal(similarity("Beeswax wrap", "Shampoo bar"), 0);
  assert.equal(similarity("Beeswax wrap large", "Beeswax wrap"), 0.8);
  assert.equal(similarity("123", "Beeswax wrap"), 0);
});

test("fuzzy match needs more than 0.8 and one clear winner", () => {
  const names = [{ productId: "wrap", name: "Beeswax Wrap" }, { productId: "bar", name: "Shampoo Bar Lavender" }, { productId: "bar", name: "Lavender shampoo" }];
  assert.deepEqual(bestFuzzy("beeswax wrap 3pk", names), { productId: "wrap", confidence: 1 });
  assert.deepEqual(bestFuzzy("SHAMPOO LAVENDER 80G", names), { productId: "bar", confidence: 1 }); // through the alias
  assert.equal(bestFuzzy("Beeswax wrap large", names), null); // exactly 0.8 is not above it
  assert.equal(bestFuzzy("Coffee", names), null);
  assert.equal(bestFuzzy("Soap bar", [{ productId: "a", name: "Soap bar 100g" }, { productId: "b", name: "Soap bar 200g" }]), null); // a tie
});
