import { PACKAGING_LABELS, PACKAGING_TYPES, PRODUCT_TYPES, TYPE_LABELS } from "./productRules.ts";

// A shop's product list as a CSV file, the format every shop system and spreadsheet exports (the wizard's "Import a list"). One product
// per row; the first row names the columns. Browser-safe: the file is read in the browser and sent on as the import's JSON.
//
//   name, kind, pieces, packaging, other names, contains
//
// - name: as the receipt or the order prints it. kind: one of the product types, by its name ("Reusable wrap") or its id.
// - pieces: how many are in one pack (empty = 1). packaging: glass, paper, metal, none or refill (or the label).
// - other names: more names for the same product, separated by "|". contains: a bundle's parts, "2 x Name | 1 x Other name".

export const CSV_COLUMNS = ["name", "kind", "pieces", "packaging", "other names", "contains"] as const;

export type CsvProduct = { name: string; type: string; pieces: number; packaging: string; aliases: string[]; parts: { name: string; count: number }[] };

/** Splits CSV text into rows of cells. Handles quoted cells (with commas, line breaks and "" inside), a byte-order mark, and the
 *  semicolon or tab some spreadsheets use instead of the comma. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.slice(0, src.search(/\r?\n|$/));
  const count = (ch: string) => firstLine.split(ch).length - 1;
  const sep = count(";") > count(",") && count(";") >= count("\t") ? ";" : count("\t") > count(",") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

const key = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** The column a heading means: shops call them differently. */
const HEADINGS: Record<string, (typeof CSV_COLUMNS)[number]> = {
  name: "name", product: "name", "product name": "name", title: "name", "receipt name": "name",
  kind: "kind", type: "kind", "product type": "kind", "what is it": "kind",
  pieces: "pieces", "pieces per pack": "pieces", "pack size": "pieces", pcs: "pieces",
  packaging: "packaging", packed: "packaging", "packaging type": "packaging",
  "other names": "other names", aliases: "other names", alias: "other names", "also printed as": "other names",
  contains: "contains", parts: "contains", bundle: "contains", "bundle contents": "contains",
};

const byLabel = <T extends string>(ids: readonly T[], label: (id: T) => string) => {
  const map = new Map<string, T>();
  for (const id of ids) { map.set(key(id), id); map.set(key(label(id)), id); }
  return (v: string) => map.get(key(v));
};
const typeOfCell = byLabel(PRODUCT_TYPES, (t) => TYPE_LABELS[t].label);
const packagingOfCell = byLabel(PACKAGING_TYPES, (t) => PACKAGING_LABELS[t]);

const list = (cell: string) => cell.split("|").map((s) => s.trim()).filter(Boolean);

/** A CSV product list as the import takes it. Problems (a missing column, a kind nobody knows) come back worded for the shop owner,
 *  with the row they are in; rows without a problem are still returned. */
export function productsFromCsv(text: string): { products: CsvProduct[]; problems: string[] } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { products: [], problems: ["The file has no products: it needs a heading row and one row per product."] };
  const cols = rows[0].map((h) => HEADINGS[key(h)]);
  const at = (name: (typeof CSV_COLUMNS)[number]) => cols.indexOf(name);
  const missing = (["name", "kind", "packaging"] as const).filter((c) => at(c) < 0);
  if (missing.length) return { products: [], problems: [`The heading row needs the column${missing.length > 1 ? "s" : ""} ${missing.map((m) => `"${m}"`).join(", ")}. All columns: ${CSV_COLUMNS.join(", ")}.`] };
  const products: CsvProduct[] = [], problems: string[] = [];
  rows.slice(1).forEach((r, i) => {
    const cell = (name: (typeof CSV_COLUMNS)[number]) => (at(name) < 0 ? "" : (r[at(name)] ?? "").trim());
    const name = cell("name"), line = `Row ${i + 2}${name ? ` (${name})` : ""}`;
    if (!name) { problems.push(`${line}: no name.`); return; }
    const parts = list(cell("contains")).map((p) => { const m = /^(\d+)\s*[x×]\s*(.+)$/i.exec(p); return m ? { name: m[2].trim(), count: Number(m[1]) } : { name: p, count: 1 }; });
    // A bundle counts as its parts, so its own kind doesn't matter: "Something else" when the cell is empty.
    const type = typeOfCell(cell("kind")) ?? (parts.length && !cell("kind") ? "other" : undefined);
    const packaging = packagingOfCell(cell("packaging"));
    const pieces = cell("pieces") ? Number(cell("pieces")) : 1;
    if (!type) { problems.push(`${line}: "${cell("kind")}" is not a kind of product we know.`); return; }
    if (!packaging) { problems.push(`${line}: packaging is glass, paper, metal, none or refill.`); return; }
    if (!Number.isInteger(pieces) || pieces < 1) { problems.push(`${line}: pieces is a whole number.`); return; }
    products.push({ name, type, pieces, packaging, aliases: list(cell("other names")), parts });
  });
  return { products, problems };
}

const quote = (v: string | number) => { const s = String(v); return /[",\n\r;|]/.test(s) && !/^[^",\n\r;]*$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/** Products as a CSV file: the template, and what a list looks like in a spreadsheet. */
export function csvFromProducts(products: CsvProduct[]): string {
  const rows = products.map((p) => [
    p.name, TYPE_LABELS[p.type as keyof typeof TYPE_LABELS]?.label ?? p.type, p.pieces, PACKAGING_LABELS[p.packaging as keyof typeof PACKAGING_LABELS] ? p.packaging : p.packaging,
    p.aliases.join(" | "), p.parts.map((x) => `${x.count} x ${x.name}`).join(" | "),
  ]);
  return [CSV_COLUMNS as readonly (string | number)[], ...rows].map((r) => r.map(quote).join(",")).join("\r\n") + "\r\n";
}

/** A few lines that show every column in use. */
export const CSV_TEMPLATE = csvFromProducts([
  { name: "Beeswax Wrap Set of 3", type: "reusable_wrap", pieces: 3, packaging: "paper", aliases: ["BW WRAP SET 3"], parts: [] },
  { name: "Shampoo Bar Lavender", type: "soap_bar", pieces: 1, packaging: "none", aliases: [], parts: [] },
  { name: "Starter Gift Set", type: "other", pieces: 1, packaging: "paper", aliases: [], parts: [{ name: "Beeswax Wrap Set of 3", count: 1 }, { name: "Shampoo Bar Lavender", count: 2 }] },
]);
