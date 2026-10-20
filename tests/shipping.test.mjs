// Shipping origin tests: `npm test`. Node runs lib/shipping.ts directly (type stripping).
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanOrigins, originFor, pickCountry } from "../lib/shipping.ts";

const thai = { label: "Chiang Mai, Thailand", lat: 18.79, lng: 98.98, countries: [] };
const us = { label: "US warehouse", lat: 40.7, lng: -74, countries: ["US"] };

test("a visitor gets the origin that serves their country, else the one for everyone else", () => {
  assert.equal(originFor([thai, us], "US").origin, us);
  assert.equal(originFor([thai, us], "DE").origin, thai);
  assert.equal(originFor([thai, us], "TH").shipsHere, true);
  assert.equal(originFor([thai, us], null).origin, thai, "unknown country: everyone else");
});

test("a shop with only country-specific origins doesn't ship elsewhere", () => {
  const r = originFor([{ ...thai, countries: ["TH"] }], "US");
  assert.equal(r.origin, null);
  assert.equal(r.shipsHere, false);
  assert.equal(originFor([], "US").shipsHere, null, "no origins: nothing known");
});

test("cleanOrigins tidies input and refuses what can't work", () => {
  assert.deepEqual(cleanOrigins([{ label: "  US   warehouse ", lat: 40.7, lng: -74, countries: ["us"] }]), [{ label: "US warehouse", lat: 40.7, lng: -74, countries: ["US"] }]);
  assert.match(String(cleanOrigins([{ label: "A" }, { label: "B" }])), /Only one place can ship to "everyone else"/);
  assert.match(String(cleanOrigins([{ label: "A", countries: ["US"] }, { label: "B", countries: ["US"] }])), /served from both/);
  assert.match(String(cleanOrigins([{ label: "A", countries: ["XX"] }])), /unknown country/);
  assert.match(String(cleanOrigins([{ label: " " }])), /Give each place/);
  assert.equal(cleanOrigins([{ label: "A", lat: 200, lng: 0 }])[0].lat, null, "an impossible pin is dropped");
});

test("the visitor's country: ?country= first, then Vercel's header, else unknown", () => {
  assert.equal(pickCountry("us", "TH"), "US");
  assert.equal(pickCountry("zz", "TH"), "TH");
  assert.equal(pickCountry(null, null), null);
});
