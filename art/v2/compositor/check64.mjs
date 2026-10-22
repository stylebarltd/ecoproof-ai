// 64 px readability check: every allowed background × item per rank (rank aura, badge "leaf"),
// rendered through the real compositor (item in its slot) and shrunk to 64 px.
// Run from the repo root: node art/v2/compositor/check64.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderArt } from "./compose.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(HERE, "traits.json"), "utf8"));
const sharp = (await import("sharp")).default;
const OUT = join(HERE, "check64");
mkdirSync(OUT, { recursive: true });

const html = [`<!doctype html><html><head><meta charset="utf-8"><title>64px check</title><style>body{font:13px system-ui;margin:16px}table{border-collapse:collapse;margin-bottom:24px}td,th{padding:3px;text-align:center}img{display:block}</style></head><body><h1>64 px readability: background × item per rank</h1>`];
for (const [rank, info] of Object.entries(T.ranks)) {
  const bgs = T.backgrounds.filter((b) => !(info.exclude_backgrounds ?? []).includes(b));
  html.push(`<h2>${info.title} (aura: ${info.aura})</h2><table><tr><th></th>${T.items.map((i) => `<th>${i}</th>`).join("")}</tr>`);
  for (const bg of bgs) {
    html.push(`<tr><th>${bg}</th>`);
    for (const item of T.items) {
      const art = await renderArt(resolve(HERE, T.ranks_dir, rank, `${rank}_card.png`), { background: bg, aura: info.aura, item, badge: "leaf" }, { mode: "slot", colour: info.colour });
      const fn = `${rank}_${bg}_${item}.png`;
      await sharp(art).resize(64, 64).png().toFile(join(OUT, fn));
      html.push(`<td><img src="check64/${fn}" width="64" height="64"></td>`);
    }
    html.push("</tr>");
  }
  html.push("</table>");
}
writeFileSync(join(HERE, "check64.html"), html.join("\n") + "</body></html>");
console.log("ok");
