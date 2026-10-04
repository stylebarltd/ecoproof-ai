// Regenerates data/superbee-products.json from the shop's public WooCommerce Store API (read-only, no login).
// Run: npx tsx scripts/superbee-catalogue.ts   then review the printout and commit the file.
import fs from "fs";
import { classify } from "../lib/superbeeCatalogue";

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#8211;/g, "–").replace(/&#8217;/g, "’").replace(/&#038;/g, "&");

async function main() {
  const out: Record<string, { name: string; parts: unknown }> = {};
  const unmapped: string[] = [];
  for (let page = 1; ; page++) {
    const r = await fetch(`https://hive.superbee.me/wp-json/wc/store/v1/products?per_page=100&page=${page}`, { headers: { "user-agent": "ecoproof-catalogue/1.0" } });
    if (!r.ok) throw new Error(`Store API ${r.status}`);
    const list = (await r.json()) as { id: number; name: string }[];
    for (const p of list) {
      const name = decode(p.name);
      const parts = classify(name);
      if (parts === null) unmapped.push(`${p.id} ${name}`);
      out[String(p.id)] = { name, parts: parts ?? [] };
    }
    if (list.length < 100) break;
  }
  fs.writeFileSync("data/superbee-products.json", JSON.stringify(out, null, 2) + "\n");
  const counted = Object.values(out).filter((p) => (p.parts as unknown[]).length).length;
  console.log(`${Object.keys(out).length} products, ${counted} counted, ${Object.keys(out).length - counted} not counted`);
  if (unmapped.length) console.log("NOT MATCHED by any rule (counted as nothing; add a rule or let the AI handle them):\n  " + unmapped.join("\n  "));
}
main().catch((e) => { console.error(e); process.exit(1); });
