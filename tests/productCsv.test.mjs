// The product list CSV: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CSV_TEMPLATE, csvFromProducts, parseCsv, productsFromCsv } from "../lib/productCsv.ts";

test("parses quoted cells, line breaks, a BOM and semicolons", () => {
  assert.deepEqual(parseCsv('﻿name,kind\r\n"Wrap, large","a ""b"""\n\n'), [["name", "kind"], ["Wrap, large", 'a "b"']]);
  assert.deepEqual(parseCsv("name;kind;packaging\nSoap;Soap or shampoo bar;none"), [["name", "kind", "packaging"], ["Soap", "Soap or shampoo bar", "none"]]);
  assert.deepEqual(parseCsv('a,b\n"two\nlines",x'), [["a", "b"], ["two\nlines", "x"]]);
});

test("reads products by label or id, with other names and bundle parts", () => {
  const { products, problems } = productsFromCsv([
    "Product name,Type,Pack size,Packaging,Aliases,Contains",
    "Beeswax Wrap Set,Reusable wrap,3,Paper,ผ้าห่อ | woo:101,",
    "Soap,soap_bar,,none,,",
    "Gift Set,,,paper,,2 x Beeswax Wrap Set | Soap",
  ].join("\n"));
  assert.deepEqual(problems, []);
  assert.deepEqual(products[0], { name: "Beeswax Wrap Set", type: "reusable_wrap", pieces: 3, packaging: "paper", aliases: ["ผ้าห่อ", "woo:101"], parts: [] });
  assert.equal(products[1].pieces, 1);
  assert.deepEqual(products[2], { name: "Gift Set", type: "other", pieces: 1, packaging: "paper", aliases: [], parts: [{ name: "Beeswax Wrap Set", count: 2 }, { name: "Soap", count: 1 }] });
});

test("says what is wrong, row by row, and keeps the good rows", () => {
  const { products, problems } = productsFromCsv("name,kind,packaging\nWrap,Reusable wrap,paper\nThing,Spaceship,paper\nJar,In glass instead of plastic,plastic\n,Soap or shampoo bar,none");
  assert.equal(products.length, 1);
  assert.deepEqual(problems, ['Row 3 (Thing): "Spaceship" is not a kind of product we know.', "Row 4 (Jar): packaging is glass, paper, metal, none or refill.", "Row 5: no name."]);
  assert.match(productsFromCsv("name,kind\nWrap,Reusable wrap").problems[0], /needs the column "packaging"/);
  assert.match(productsFromCsv("name,kind,packaging").problems[0], /no products/);
});

test("the template reads back as it was written", () => {
  const { products, problems } = productsFromCsv(CSV_TEMPLATE);
  assert.deepEqual(problems, []);
  assert.equal(products.length, 3);
  assert.deepEqual(productsFromCsv(csvFromProducts(products)).products, products);
});
