// Re-render the sample cards in samples/ from their own metadata (tier, serial, impact, dates), e.g. after a rank card changed.
// Run from the repo root: node art/v2/compositor/samples.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderCard } from "./compose.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, "samples");
const WALLET = "EcoProofSampleWallet11111111111111111111111"; // samples only; traits are a deterministic pick from wallet|tier|serial
const sharp = (await import("sharp")).default;
const attr = (m, k) => m.attributes.find((a) => a.trait_type === k)?.value;

const done = [];
for (const f of readdirSync(DIR).filter((n) => n.endsWith(".json")).sort()) {
  const m = JSON.parse(readFileSync(join(DIR, f), "utf8"));
  const collection = attr(m, "collection");
  const tierTitle = attr(m, "tier");
  const card = {
    collection, serial: attr(m, "serial"), wallet: WALLET,
    impact: { plastic_g: attr(m, "plastic_avoided_g"), co2e_g: attr(m, "co2e_avoided_g"), stamps: attr(m, "stamps") },
    unlocked_by: attr(m, "unlocked_by"), minted_at: attr(m, "minted_at"),
  };
  if (collection === "rank") card.tier = tierTitle.toLowerCase();
  else {
    card.tier = f.replace(/-\d+\.json$/, ""); card.title = tierTitle;
    card.item = (attr(m, "item") ?? "none").replace(/ /g, "_"); card.aura_min = (attr(m, "aura") ?? "none").replace(/ /g, "_");
    const season = attr(m, "season"), cap = attr(m, "cap");
    if (season) card.season = season; if (cap && cap !== "open") card.cap = cap;
  }
  const stem = join(DIR, f.replace(/\.json$/, ""));
  const { png, art, metadata } = await renderCard(card);
  writeFileSync(`${stem}.png`, png); writeFileSync(`${stem}_art.png`, art); writeFileSync(`${stem}.json`, JSON.stringify(metadata, null, 2));
  done.push(stem); console.log(f.replace(/\.json$/, ""));
}
// overview: all cards in a row, 360 px wide each
const tiles = await Promise.all(done.map((s) => sharp(`${s}.png`).resize({ width: 360 }).png().toBuffer()));
const h = (await sharp(tiles[0]).metadata()).height;
await sharp({ create: { width: 360 * tiles.length, height: h, channels: 4, background: "#ffffff" } })
  .composite(tiles.map((input, i) => ({ input, left: 360 * i, top: 0 }))).png().toFile(join(DIR, "_overview.png"));
console.log("overview ok");
