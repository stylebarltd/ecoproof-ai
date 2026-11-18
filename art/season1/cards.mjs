// Season 1 test cards in the card frame (art/v2/compositor: frame, fonts, stats), each with its own finished picture from this folder.
// Serial, impact and place are sample values. Run from the repo root: node art/season1/cards.mjs → art/season1/cards/<card>.png + _overview.png
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderCard } from "../v2/compositor/compose.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(HERE, "../v2/compositor/traits.json"), "utf8"));
const sharp = (await import("sharp")).default;
const OUT = join(HERE, "cards"); mkdirSync(OUT, { recursive: true });
// rank, title, how it is earned, supply of the design (plan of 2026-11-18)
const CARDS = [
  ["morning_cup", "sentinel", "Morning Cup", "LUCKY", 650, 41],
  ["market_day", "sentinel", "Market Day", "LUCKY", 650, 112],
  ["first_trail", "sentinel", "First Trail", "EXPLORER", 650, 7],
  ["first_proof", "sentinel", "First Proof", "IMPACT", 650, 23],
];
const done = [];
for (const [key, rank, title, how, cap, serial] of CARDS) {
  const { png } = await renderCard({
    collection: "achievement", tier: key, title, serial, wallet: "EcoProofSampleWallet11111111111111111111111", colour: T.ranks[rank].colour,
    art_file: join(HERE, `${key}.png`), subtitle: `SEASON 1 · ${T.ranks[rank].title.toUpperCase()} · ${how} · ${serial} OF ${cap}`,
    impact: { plastic_g: 840, co2e_g: 5200, stamps: 4 }, unlocked_by: "Riverside Resort", minted_at: "2026-12-01", season: "Season 1",
  });
  writeFileSync(join(OUT, `${key}.png`), png); done.push(join(OUT, `${key}.png`)); console.log(key);
}
const tiles = await Promise.all(done.map((f) => sharp(f).resize({ width: 480 }).png().toBuffer()));
const h = (await sharp(tiles[0]).metadata()).height;
await sharp({ create: { width: 480 * tiles.length, height: h, channels: 4, background: "#ffffff" } }).composite(tiles.map((input, i) => ({ input, left: 480 * i, top: 0 }))).png().toFile(join(OUT, "_overview.png"));
