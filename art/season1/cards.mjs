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
  ["refill_round", "warden", "Refill Round", "LUCKY", 325, 18],
  ["rain_patrol", "warden", "Rain Patrol", "LUCKY", 325, 8],
  ["four_corners", "warden", "Four Corners", "EXPLORER", 325, 5],
  ["wrap_it", "warden", "Wrap It", "IMPACT", 325, 14],
  ["hive_workshop", "guardian", "Hive Workshop", "LUCKY", 160, 22],
  ["night_watch", "guardian", "Night Watch", "LUCKY", 160, 12],
  ["river_crossing", "guardian", "River Crossing", "EXPLORER", 160, 9],
  ["kilo_keeper", "guardian", "Kilo Keeper", "IMPACT", 160, 18],
  ["mountain_pass", "vanguard", "Mountain Pass", "LUCKY", 75, 26],
  ["storm_flight", "vanguard", "Storm Flight", "LUCKY", 75, 16],
  ["twelve_flags", "vanguard", "Twelve Flags", "EXPLORER", 75, 13],
  ["clean_shore", "vanguard", "Clean Shore", "IMPACT", 75, 22],
  ["golden_hour", "paragon", "Golden Hour", "LUCKY", 40, 30],
  ["great_hive", "paragon", "The Great Hive", "LUCKY", 40, 20],
  ["world_walker", "paragon", "World Walker", "EXPLORER", 40, 17],
  ["old_oak", "paragon", "Old Oak", "IMPACT", 40, 26],
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
// one overview per rank: its four cards in a row
for (const rank of Object.keys(T.ranks)) {
  const files = CARDS.filter((c) => c[1] === rank).map((c) => join(OUT, `${c[0]}.png`)); if (!files.length) continue;
  const tiles = await Promise.all(files.map((f) => sharp(f).resize({ width: 480 }).png().toBuffer()));
  const h = (await sharp(tiles[0]).metadata()).height;
  await sharp({ create: { width: 480 * tiles.length, height: h, channels: 4, background: "#ffffff" } }).composite(tiles.map((input, i) => ({ input, left: 480 * i, top: 0 }))).png().toFile(join(OUT, `_${rank}.png`));
}
