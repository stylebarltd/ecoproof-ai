import type { Tier } from "./milestoneRules";

/** A plain card with the rank name, used only when a rank's artwork file is missing. */
export const rankPlaceholderSvg = (rank: Tier) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="${rank.name} Bee Guardian">`
  + `<rect width="512" height="512" rx="48" fill="#1d2416"/><rect x="10" y="10" width="492" height="492" rx="40" fill="none" stroke="#e8a317" stroke-width="4"/>`
  + `<text x="256" y="240" text-anchor="middle" font-family="sans-serif" font-size="56" font-weight="700" fill="#f7d27a">${rank.name}</text>`
  + `<text x="256" y="300" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#dcebc4">Bee Guardian · Tier ${rank.tier}</text></svg>`;
