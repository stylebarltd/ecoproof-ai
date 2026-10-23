// Store door assets: a SuperBee till receipt and the EcoProof phone screen after scanning it. Impact per line from lib/impact.ts
// factors (beeswax_wrap, plastic_free_laundry, plastic_free_oral_care, solid_personal_care). Prices are placeholders.
// Run from the repo root: node art/doors/v2/assets.mjs  → art/doors/v2/receipt.png, screen.png
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
process.env.FONTCONFIG_FILE = join(HERE, "../../steps/stamp/fonts.conf");
const sharp = (await import("sharp")).default;
const C = { paper: "#f4e9d8", cocoa: "#3a2a1c", honey: "#e08a2e", honeyDeep: "#b96a1d", leaf: "#6f8f4e", sky: "#8fa9c8" };
const M = `font-family="DejaVu Sans Mono"`, F = `font-family="Figtree"`, H = `font-family="Caprasimo"`;
const ITEMS = [
  { name: "Beeswax Wraps SML x3", price: 390, co2: 0.6, plastic: 50, cat: "Beeswax wrap" },
  { name: "HexaWash pouch 120 g", price: 450, co2: 3.0, plastic: 7, cat: "Plastic-free laundry" },
  { name: "Dentos tablets", price: 190, co2: 0.15, plastic: 1, cat: "Plastic-free oral care" },
  { name: "Shampoo bar", price: 220, co2: 0.3, plastic: 1, cat: "Solid personal care" },
];
const co2 = ITEMS.reduce((n, i) => n + i.co2, 0).toFixed(2), plastic = ITEMS.reduce((n, i) => n + i.plastic, 0), total = ITEMS.reduce((n, i) => n + i.price, 0);

// receipt, thermal-printer look, 520 x 1040
const rl = (y, l, r, w = "normal", s = 22) => `<text x="34" y="${y}" ${M} font-size="${s}" font-weight="${w}" fill="#2b2622">${l}</text>${r ? `<text x="486" y="${y}" text-anchor="end" ${M} font-size="${s}" font-weight="${w}" fill="#2b2622">${r}</text>` : ""}`;
let y = 210;
const lines = ITEMS.map((i) => { const s = rl(y, i.name, `${i.price}.00`); y += 40; return s; }).join("");
const receipt = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="1040">
  <rect width="520" height="1040" fill="#ffffff"/>
  <text x="260" y="70" text-anchor="middle" ${M} font-size="34" font-weight="bold" fill="#2b2622">SUPERBEE</text>
  <text x="260" y="104" text-anchor="middle" ${M} font-size="19" fill="#2b2622">Shop &amp; Showroom</text>
  <text x="260" y="132" text-anchor="middle" ${M} font-size="19" fill="#2b2622">Samoeng, Chiang Mai</text>
  ${rl(172, "22/10/2026 14:07", "#004127", "normal", 19)}
  <line x1="34" y1="185" x2="486" y2="185" stroke="#2b2622" stroke-width="2" stroke-dasharray="6 6"/>
  ${lines}
  <line x1="34" y1="${y - 10}" x2="486" y2="${y - 10}" stroke="#2b2622" stroke-width="2" stroke-dasharray="6 6"/>
  ${rl(y + 30, "TOTAL THB", `${total}.00`, "bold", 26)}
  ${rl(y + 70, "PromptPay", `${total}.00`, "normal", 20)}
  <text x="260" y="${y + 150}" text-anchor="middle" ${M} font-size="19" fill="#2b2622">Thank you for choosing</text>
  <text x="260" y="${y + 178}" text-anchor="middle" ${M} font-size="19" fill="#2b2622">plastic-free!</text>
  <g transform="translate(150 ${y + 220})" fill="#2b2622">${Array.from({ length: 44 }, (_, k) => `<rect x="${k * 5}" width="${[2, 3, 1, 2, 4][k % 5]}" height="70"/>`).join("")}</g>
  <text x="260" y="${y + 320}" text-anchor="middle" ${M} font-size="17" fill="#2b2622">Scan this receipt with EcoProof</text>
</svg>`;
writeFileSync(join(HERE, "receipt.png"), await sharp(Buffer.from(receipt)).png().toBuffer());

// phone screen, 600 x 1300
let yy = 520;
const rows = ITEMS.map((i) => { const s = `
  <g transform="translate(40 ${yy})">
    <rect width="520" height="92" rx="18" fill="#fffaf0" stroke="${C.cocoa}" stroke-opacity="0.12" stroke-width="2"/>
    <circle cx="44" cy="46" r="22" fill="${C.leaf}" opacity="0.18"/><path d="M33 47 l8 8 l15 -17" fill="none" stroke="${C.leaf}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="82" y="40" ${F} font-weight="800" font-size="24" fill="${C.cocoa}">${i.name}</text>
    <text x="82" y="70" ${F} font-weight="600" font-size="19" fill="${C.cocoa}" fill-opacity="0.6">${i.cat}</text>
    <text x="500" y="40" text-anchor="end" ${F} font-weight="800" font-size="22" fill="${C.honeyDeep}">−${i.co2} kg</text>
    <text x="500" y="70" text-anchor="end" ${F} font-weight="700" font-size="19" fill="${C.cocoa}" fill-opacity="0.6">${i.plastic} plastic</text>
  </g>`; yy += 106; return s; }).join("");
const screen = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1300">
  <rect width="600" height="1300" fill="${C.paper}"/>
  <text x="40" y="96" ${H} font-size="34" fill="${C.cocoa}">Eco<tspan fill="${C.honeyDeep}">Proof</tspan></text>
  <g transform="translate(400 66)"><rect width="160" height="44" rx="22" fill="${C.leaf}" opacity="0.15"/><text x="80" y="30" text-anchor="middle" ${F} font-weight="800" font-size="19" fill="${C.leaf}">✓ Scanned</text></g>
  <text x="40" y="170" ${F} font-weight="800" font-size="20" letter-spacing="3" fill="${C.cocoa}" fill-opacity="0.6">RECEIPT · SUPERBEE</text>
  <text x="40" y="236" ${H} font-size="52" fill="${C.cocoa}">${co2} kg CO₂</text>
  <text x="40" y="280" ${F} font-weight="700" font-size="26" fill="${C.cocoa}" fill-opacity="0.75">saved with this purchase</text>
  <g transform="translate(40 318)">
    <rect width="250" height="150" rx="22" fill="${C.honey}"/>
    <text x="24" y="70" ${H} font-size="52" fill="#fff">${plastic}</text>
    <text x="24" y="112" ${F} font-weight="800" font-size="20" fill="#fff">single-use plastics</text>
    <text x="24" y="136" ${F} font-weight="800" font-size="20" fill="#fff">avoided</text>
    <rect x="270" width="250" height="150" rx="22" fill="${C.cocoa}"/>
    <text x="294" y="70" ${H} font-size="52" fill="#fff">+5</text>
    <text x="294" y="112" ${F} font-weight="800" font-size="20" fill="#fff">points · verified</text>
    <text x="294" y="136" ${F} font-weight="800" font-size="20" fill="#fff">purchase</text>
  </g>
  <text x="40" y="502" ${F} font-weight="800" font-size="20" letter-spacing="3" fill="${C.cocoa}" fill-opacity="0.6">4 ITEMS RECOGNISED</text>
  ${rows}
  <g transform="translate(40 ${yy + 14})">
    <rect width="520" height="76" rx="38" fill="${C.cocoa}"/>
    <g transform="translate(150 26) scale(1)" fill="#fff"><polygon points="5,3.5 22,3.5 19,7.5 2,7.5"/><polygon points="2,10 19,10 22,14 5,14"/><polygon points="5,16.5 22,16.5 19,20.5 2,20.5"/></g>
    <text x="184" y="47" ${F} font-weight="800" font-size="24" fill="#fff">Proof on Solana</text>
  </g>
</svg>`;
writeFileSync(join(HERE, "screen.png"), await sharp(Buffer.from(screen)).png().toBuffer());
console.log(`receipt + screen written · ${co2} kg CO2, ${plastic} plastics, ${total} THB`);
