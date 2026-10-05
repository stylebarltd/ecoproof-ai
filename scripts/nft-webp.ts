// Makes the 512px copies of the Bee Guardian artwork. The full PNGs in public/nft stay the NFT image.
//  - public/nft/web/<rank>.webp: the passport page and the about page
//  - public/nft/web/<rank>.png:  the share images (next/og cannot decode WebP) Run again after replacing a PNG: npx tsx scripts/nft-webp.ts
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { RANKS } from "../lib/milestoneRules";

const dir = path.join(process.cwd(), "public/nft");
async function main() {
  fs.mkdirSync(path.join(dir, "web"), { recursive: true });
  for (const { key } of RANKS) {
    const src = path.join(dir, `${key}.png`), out = path.join(dir, "web", `${key}.webp`);
    if (!fs.existsSync(src)) { console.warn(`missing ${src}`); continue; }
    await sharp(src).resize(512, 512, { fit: "inside" }).webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(out);
    await sharp(src).resize(512, 512, { fit: "inside" }).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(out.replace(/\.webp$/, ".png"));
    console.log(`${key}: ${Math.round(fs.statSync(src).size / 1024)} KB png -> ${Math.round(fs.statSync(out).size / 1024)} KB webp`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
