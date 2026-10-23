// The live impact badge an eco shop can put on its own site: an SVG served by /api/badge/<place>.svg with the shop's verified numbers,
// re-read every few minutes, so it is never a printed claim. Fonts are the viewer's (Verdana/DejaVu, like shields.io); textLength pins
// every label to the width the layout reserved, so the badge is the same shape in every browser.
import { appUrl } from "./nft";
import type { ShopImpact } from "./shops";

const INK = "#3a2a1c"; // cocoa
const PAPER = "#f4e9d8";
const HONEY = "#e08a2e";
const H = 30;
const FONT = "Verdana, 'DejaVu Sans', Geneva, sans-serif";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const width = (s: string, size: number) => Math.round(s.length * size * 0.62); // Verdana averages ~0.62 em per character
const num = (v: number) => new Intl.NumberFormat("en").format(Math.round(v));

/** What the badge says on its right half: the verified numbers, or, before the first verified purchase, what the shop is. */
export function badgeText(impact: Pick<ShopImpact, "purchases" | "plasticItems" | "co2Kg">): string {
  if (impact.purchases === 0) return "verified eco shop · proofs on Solana";
  return `${num(impact.plasticItems)} plastic items · ${num(impact.co2Kg)} kg CO₂e avoided`;
}

export function badgeSvg(name: string, impact: Pick<ShopImpact, "purchases" | "plasticItems" | "co2Kg">): string {
  const brand = "EcoProof"; const right = badgeText(impact);
  const bw = width(brand, 12); const rw = width(right, 11.5);
  const leftW = 12 + 16 + 7 + bw + 12; const rightW = 12 + rw + 12; const W = leftW + rightW;
  const label = `${name} · ${right} · verified on EcoProof`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<clipPath id="r"><rect width="${W}" height="${H}" rx="6"/></clipPath>
<g clip-path="url(#r)"><rect width="${leftW}" height="${H}" fill="${INK}"/><rect x="${leftW}" width="${rightW}" height="${H}" fill="${PAPER}"/></g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="6" fill="none" stroke="${INK}" stroke-opacity="0.35"/>
<svg x="12" y="${(H - 16) / 2}" width="16" height="16" viewBox="0 0 48 48" fill="none" stroke="${PAPER}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M24 6C14 6 8 14 8 24c0 9 6 16 16 16 8 0 14-6 14-14 0-12-8-20-14-20z" fill="${HONEY}" stroke="none"/><path d="M16 25l5.5 6L33 17" stroke="${INK}"/></svg>
<text x="${12 + 16 + 7}" y="${H / 2}" dominant-baseline="central" font-family="${FONT}" font-size="12" font-weight="700" fill="${PAPER}" textLength="${bw}" lengthAdjust="spacingAndGlyphs">${brand}</text>
<text x="${leftW + 12}" y="${H / 2}" dominant-baseline="central" font-family="${FONT}" font-size="11.5" fill="${INK}" textLength="${rw}" lengthAdjust="spacingAndGlyphs">${esc(right)}</text>
</svg>`;
}

/** The snippet a shop pastes into its site: the badge image, linking to the shop's public page where every number has its proofs. */
export function badgeEmbed(placeId: string, name: string): string {
  const base = appUrl();
  return `<a href="${base}/places/${placeId}#proofs"><img src="${base}/api/badge/${placeId}.svg" alt="${esc(name)} · verified impact on EcoProof" height="${H}"></a>`;
}
