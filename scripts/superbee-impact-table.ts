// Writes docs/woocommerce/superbee-impact-table.md: what each SuperBee product will claim, for the owner to review before launch.
// Run: npx tsx scripts/superbee-impact-table.ts
import fs from "fs";
import products from "../data/superbee-products.json";
import { computeImpact, FACTORS, type Category } from "../lib/impact";

const rows = Object.entries(products as unknown as Record<string, { name: string; parts: [Category, number][] }>)
  .filter(([, p]) => !/[฀-๿]/.test(p.name)) // English names only: every product has a Thai twin with the same impact
  .sort((a, b) => a[1].name.localeCompare(b[1].name));
let md = `# What each SuperBee product claims\n\nGenerated from \`data/superbee-products.json\` and the factor table in \`lib/impact.ts\`. **Estimates**, shown to customers on their verified-purchase stamp. Please review: if a number looks too generous or too modest, tell me which factor to change.\n\n| Product (id) | Counts as | Single-use plastics avoided | CO₂ saved | Packaging cut |\n|---|---|---:|---:|---:|\n`;
for (const [id, p] of rows) {
  const items = p.parts.map(([category, n]) => ({ name: p.name, quantity: n, category, confidence: 1 }));
  const i = computeImpact(items);
  const what = p.parts.length ? p.parts.map(([c, n]) => `${n > 1 ? n + "× " : ""}${FACTORS[c].label}`).join(", ") : "not counted";
  md += `| ${p.name} (${id}) | ${what} | ${i.plasticItems} | ${i.co2Kg} kg | ${i.packagingG} g |\n`;
}
md += `\n## The per-unit factors behind these numbers\n\n| Category | Plastics | CO₂ | Packaging | Reasoning in the code |\n|---|---:|---:|---:|---|\n`;
for (const [c, f] of Object.entries(FACTORS)) md += `| ${f.label} | ${f.plasticItems} | ${f.co2Kg} kg | ${f.packagingG} g | |\n`;
fs.writeFileSync("docs/woocommerce/superbee-impact-table.md", md);
console.log(`wrote ${rows.length} products`);
