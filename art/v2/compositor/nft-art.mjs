// The static per-rank NFT image (public/nft/<rank>.png, 1024 px): the rank's card on a fixed background with its aura and the leaf
// badge, no item (items and personalisation belong to the per-mint card, not to the rank image). Run from the repo root:
//   node art/v2/compositor/nft-art.mjs && npx tsx scripts/nft-webp.ts
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderArt } from "./compose.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(HERE, "traits.json"), "utf8"));
const BACKGROUND = { sentinel: "dusty_blue", warden: "kraft", guardian: "sage_grey", vanguard: "terracotta", paragon: "night_brown" };
for (const [rank, info] of Object.entries(T.ranks)) {
  const art = await renderArt(resolve(HERE, T.ranks_dir, rank, `${rank}_card.png`), { background: BACKGROUND[rank], aura: info.aura, item: "none", badge: "leaf" }, { colour: info.colour });
  writeFileSync(resolve(HERE, "../../../public/nft", `${rank}.png`), art); console.log(rank, BACKGROUND[rank], info.aura);
}
