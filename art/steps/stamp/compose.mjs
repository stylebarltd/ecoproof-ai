// "Every verified order or visit becomes a stamp": the how-it-works step 2 picture. A kraft poster with four paper stations on a
// dashed path: scan the QR → proof written to Solana → stamp in the passport → Bee Guardian minted. Real assets: the demo café QR
// card (art/steps/connect/card.png) and the Sentinel rank card (public/landing/cards/sentinel.webp). SVG rendered by sharp.
// Run from the repo root: node art/steps/stamp/compose.mjs   → art/steps/stamp/stamp.png (1600) + public/landing/steps/stamp.webp (800)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
process.env.FONTCONFIG_FILE = join(HERE, "fonts.conf");
const sharp = (await import("sharp")).default;

const W = 1600, C = { paper: "#f4e9d8", kraft: "#d9b88c", kraftDeep: "#b8905f", cocoa: "#3a2a1c", honey: "#e08a2e", honeyDeep: "#b96a1d", sky: "#8fa9c8", leaf: "#6f8f4e", terracotta: "#c9704e" };
const b64 = async (file, w, h) => `data:image/png;base64,${(await sharp(file).resize(w, h, { fit: "inside" }).png().toBuffer()).toString("base64")}`;
const qr = `data:image/png;base64,${(await sharp(resolve(HERE, "../connect/card.png")).extract({ left: 90, top: 115, width: 570, height: 570 }).resize(600, 600).png().toBuffer()).toString("base64")}`;
const card = await b64(resolve(HERE, "../../../public/landing/cards/sentinel.webp"), 480, 672);
const H = `font-family="Caprasimo"`, F = `font-family="Figtree"`, M = `font-family="DejaVu Sans Mono"`;

// a paper station card with a soft shadow and the sticker's white edge
const station = (x, y, w, h, rot, inner) => `
  <g transform="translate(${x} ${y}) rotate(${rot} ${w / 2} ${h / 2})">
    <rect x="10" y="16" width="${w}" height="${h}" rx="22" fill="#28180c" opacity="0.18" filter="url(#blur)"/>
    <rect width="${w}" height="${h}" rx="22" fill="${C.paper}" stroke="#ffffff" stroke-opacity="0.9" stroke-width="5"/>
    ${inner}
  </g>`;
// numbered round stamp in sky, like the StampMark on the landing
const mark = (x, y, n, label, rot) => `
  <g transform="translate(${x} ${y}) rotate(${rot})" fill="none" stroke="${C.sky}" style="mix-blend-mode:multiply">
    <circle r="58" stroke-width="4"/><circle r="47" stroke-width="2.5" stroke-dasharray="7 6"/>
    <text y="-4" text-anchor="middle" fill="${C.sky}" stroke="none" ${H} font-size="40">${n}</text>
    <text y="26" text-anchor="middle" fill="${C.sky}" stroke="none" ${F} font-weight="800" font-size="15" letter-spacing="3">${label}</text>
  </g>`;
const solana = (x, y, s, fill) => `<g transform="translate(${x} ${y}) scale(${s / 24})" fill="${fill}"><polygon points="5,3.5 22,3.5 19,7.5 2,7.5"/><polygon points="2,10 19,10 22,14 5,14"/><polygon points="5,16.5 22,16.5 19,20.5 2,20.5"/></g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">
  <defs>
    <filter id="blur" x="-10%" y="-10%" width="130%" height="130%"><feGaussianBlur stdDeviation="10"/></filter>
    <radialGradient id="vig" cx="50%" cy="50%" r="72%"><stop offset="55%" stop-color="${C.cocoa}" stop-opacity="0"/><stop offset="100%" stop-color="${C.cocoa}" stop-opacity="0.16"/></radialGradient>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.cocoa}" opacity="0.7"/></marker>
    <clipPath id="screen"><rect x="0" y="0" width="300" height="560" rx="34"/></clipPath>
  </defs>
  <rect width="${W}" height="${W}" fill="${C.kraft}"/>
  <rect width="${W}" height="${W}" fill="url(#vig)"/>

  <!-- the path: 1 → 2 across the top, down to 3, across to 4 -->
  <path d="M 560 330 C 680 300, 760 300, 880 330" fill="none" stroke="${C.cocoa}" stroke-opacity="0.7" stroke-width="7" stroke-dasharray="18 16" marker-end="url(#arrow)"/>
  <path d="M 1120 668 C 1120 780, 900 780, 560 880" fill="none" stroke="${C.cocoa}" stroke-opacity="0.7" stroke-width="7" stroke-dasharray="18 16" marker-end="url(#arrow)"/>
  <path d="M 700 1180 C 790 1150, 850 1150, 930 1180" fill="none" stroke="${C.cocoa}" stroke-opacity="0.7" stroke-width="7" stroke-dasharray="18 16" marker-end="url(#arrow)"/>

  <!-- 1: phone scanning the demo café QR card -->
  ${station(130, 130, 440, 620, -2.5, `
    <g transform="translate(76 44) scale(0.9)">
      <rect x="-14" y="-14" width="328" height="588" rx="46" fill="${C.cocoa}"/>
      <g clip-path="url(#screen)">
        <rect width="300" height="560" fill="#1b1613"/>
        <rect width="300" height="560" fill="#6b655c"/>
        <image href="${qr}" x="24" y="154" width="252" height="252"/>
        <rect width="300" height="560" fill="#000" opacity="0.12"/>
      </g>
      <!-- viewfinder corners around the QR -->
      <g fill="none" stroke="${C.honey}" stroke-width="7" stroke-linecap="round">
        <path d="M14 176 v-32 h32"/><path d="M254 144 h32 v32"/><path d="M14 384 v32 h32"/><path d="M286 384 v32 h-32"/>
      </g>
      <rect x="20" y="286" width="260" height="4" fill="${C.honey}" opacity="0.85"/>
      <rect x="110" y="18" width="80" height="10" rx="5" fill="#000" opacity="0.5"/>
      <rect x="40" y="470" width="220" height="56" rx="28" fill="${C.honey}"/>
      <text x="150" y="506" text-anchor="middle" fill="#fff" ${F} font-weight="800" font-size="24">Scan to collect</text>
    </g>`)}
  ${mark(160, 150, 1, "SCAN", -8)}

  <!-- 2: the proof ticket -->
  ${station(900, 170, 560, 480, 2, `
    <g transform="translate(40 80)">
      ${solana(0, 2, 44, C.cocoa)}
      <text x="60" y="38" fill="${C.cocoa}" ${H} font-size="44">Proof on Solana</text>
      <line x1="0" y1="66" x2="480" y2="66" stroke="${C.cocoa}" stroke-opacity="0.25" stroke-width="2" stroke-dasharray="6 6"/>
      <text x="0" y="104" fill="${C.cocoa}" fill-opacity="0.65" ${F} font-weight="800" font-size="17" letter-spacing="3">ONE SCAN · ONE STAMP · ONE RECORD</text>
      <rect x="0" y="124" width="480" height="150" rx="14" fill="#fffaf0" stroke="${C.cocoa}" stroke-opacity="0.2" stroke-width="2"/>
      <text x="22" y="160" fill="${C.cocoa}" fill-opacity="0.7" ${M} font-size="18">place   demo-cafe</text>
      <text x="22" y="190" fill="${C.cocoa}" fill-opacity="0.7" ${M} font-size="18">time    2026-10-22 14:07</text>
      <text x="22" y="220" fill="${C.cocoa}" ${M} font-weight="bold" font-size="18">sha256  7f3a 91c0 e4b2 … 5d8c</text>
      <text x="22" y="252" fill="${C.honeyDeep}" ${M} font-size="18">memo tx + claim account ✓</text>
      <g transform="translate(392 330) rotate(-9)" style="mix-blend-mode:multiply">
        <rect x="-112" y="-30" width="224" height="60" rx="30" fill="none" stroke="${C.leaf}" stroke-width="4"/>
        <rect x="-102" y="-20" width="204" height="40" rx="20" fill="none" stroke="${C.leaf}" stroke-width="2" stroke-dasharray="6 5"/>
        <text y="9" text-anchor="middle" fill="${C.leaf}" ${F} font-weight="800" font-size="24" letter-spacing="4">VERIFIED</text>
      </g>
      <text x="0" y="322" fill="${C.cocoa}" fill-opacity="0.75" ${F} font-weight="600" font-size="20">Anyone can recompute it.</text>
      <text x="0" y="350" fill="${C.cocoa}" fill-opacity="0.75" ${F} font-weight="600" font-size="20">Nobody can fake it.</text>
    </g>`)}
  ${mark(905, 175, 2, "PROOF", 6)}

  <!-- 3: the passport page with its new stamp -->
  ${station(130, 900, 560, 580, 1.5, `
    <g transform="translate(40 64)">
      <text x="0" y="40" fill="${C.cocoa}" ${H} font-size="44">Eco passport</text>
      <text x="0" y="78" fill="${C.cocoa}" fill-opacity="0.65" ${F} font-weight="800" font-size="17" letter-spacing="3">STAMP COLLECTION · 7 POINTS</text>
      <!-- earlier stamps, faint -->
      <g fill="none" stroke="${C.cocoa}" stroke-opacity="0.35" stroke-width="3">
        <circle cx="60" cy="190" r="58"/><circle cx="60" cy="190" r="46" stroke-dasharray="6 5" stroke-width="2"/>
        <circle cx="190" cy="190" r="58"/><circle cx="190" cy="190" r="46" stroke-dasharray="6 5" stroke-width="2"/>
      </g>
      <text x="60" y="198" text-anchor="middle" fill="${C.cocoa}" fill-opacity="0.45" ${F} font-weight="800" font-size="16" letter-spacing="2">HOTEL</text>
      <text x="190" y="198" text-anchor="middle" fill="${C.cocoa}" fill-opacity="0.45" ${F} font-weight="800" font-size="16" letter-spacing="2">SHOP</text>
      <!-- the new stamp, just pressed: honey, rotated, a little ink bleed -->
      <g transform="translate(400 200) rotate(-11)" style="mix-blend-mode:multiply">
        <circle r="96" fill="${C.honey}" opacity="0.14"/>
        <circle r="92" fill="none" stroke="${C.honeyDeep}" stroke-width="7"/>
        <circle r="76" fill="none" stroke="${C.honeyDeep}" stroke-width="3" stroke-dasharray="8 6"/>
        <text y="-18" text-anchor="middle" fill="${C.honeyDeep}" ${H} font-size="30">Demo Café</text>
        <text y="16" text-anchor="middle" fill="${C.honeyDeep}" ${F} font-weight="800" font-size="20" letter-spacing="3">PRESENCE</text>
        <text y="50" text-anchor="middle" fill="${C.honeyDeep}" ${H} font-size="34">+1 point</text>
      </g>
      <line x1="0" y1="330" x2="480" y2="330" stroke="${C.cocoa}" stroke-opacity="0.2" stroke-width="2"/>
      <text x="0" y="372" fill="${C.cocoa}" ${F} font-weight="700" font-size="22">Café visit 1 · hotel stay 2 · verified order 5</text>
      <text x="0" y="406" fill="${C.cocoa}" fill-opacity="0.7" ${F} font-weight="600" font-size="20">Each stamp names the place and links its proof.</text>
      <!-- progress to the first Bee Guardian -->
      <rect x="0" y="436" width="480" height="18" rx="9" fill="${C.cocoa}" fill-opacity="0.12"/>
      <rect x="0" y="436" width="336" height="18" rx="9" fill="${C.honey}"/>
      <text x="480" y="486" text-anchor="end" fill="${C.cocoa}" fill-opacity="0.7" ${F} font-weight="700" font-size="18">3 points to Guardian</text>
    </g>`)}
  ${mark(160, 920, 3, "STAMP", -5)}

  <!-- 4: the minted Bee Guardian -->
  ${station(940, 860, 520, 600, -1.5, `
    <image href="${card}" x="120" y="76" width="330" height="462"/>
    <g transform="translate(70 120) rotate(-14)" style="mix-blend-mode:multiply">
      <rect x="-88" y="-30" width="176" height="60" rx="30" fill="none" stroke="${C.terracotta}" stroke-width="4"/>
      <rect x="-78" y="-20" width="156" height="40" rx="20" fill="none" stroke="${C.terracotta}" stroke-width="2" stroke-dasharray="6 5"/>
      <text y="9" text-anchor="middle" fill="${C.terracotta}" ${F} font-weight="800" font-size="24" letter-spacing="4">MINTED</text>
    </g>
    <g fill="${C.honey}"><path d="M60 300 l8 22 l22 8 l-22 8 l-8 22 l-8 -22 l-22 -8 l22 -8z"/><path d="M110 380 l5 14 l14 5 l-14 5 l-5 14 l-5 -14 l-14 -5 l14 -5z"/><path d="M472 526 l6 16 l16 6 l-16 6 l-6 16 l-6 -16 l-16 -6 l16 -6z"/></g>
    <text x="40" y="568" fill="${C.cocoa}" ${H} font-size="34">Sentinel, earned</text>
    <text x="40" y="594" fill="${C.cocoa}" fill-opacity="0.7" ${F} font-weight="700" font-size="18">Soulbound NFT. Can't be bought, only earned.</text>`)}
  ${mark(1440, 880, 4, "MINT", 7)}
</svg>`;

const base = await sharp(Buffer.from(svg)).png().toBuffer();
// paper grain: soft monochrome noise multiplied in at low strength
const noise = await sharp(Buffer.from(Array.from({ length: W * W }, () => 200 + Math.floor(Math.random() * 56))), { raw: { width: W, height: W, channels: 1 } }).png().toBuffer();
const out = await sharp(base).composite([{ input: noise, blend: "multiply" }]).png().toBuffer();
writeFileSync(join(HERE, "stamp.png"), out);
await sharp(out).resize(800, 800).webp({ quality: 84, effort: 6 }).toFile(resolve(HERE, "../../../public/landing/steps/stamp.webp"));
console.log("stamp.png + public/landing/steps/stamp.webp written");
