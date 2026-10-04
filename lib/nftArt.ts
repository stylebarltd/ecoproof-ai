import { milestoneLabel, tierFor } from "./milestoneRules";

export type NftStats = { milestone: number; proofs: number; plasticItems: number; co2Kg: number; brand: string; /** the owner's wallet: makes the character theirs (same face at every tier). Without it a default character is drawn. */ seed?: string };

// Code-drawn, deterministic artwork: four tiers that visibly level up (Seedling -> Sprout -> Guardian -> Legend).
// Same input => same SVG, so the image never depends on an external model or service. Legend scales with the milestone.
const G = "#e8a317", GL = "#f7d27a", GD = "#a86f00"; // honey gold
const DG = "#272e1b", MG = "#56633f", SG = "#8fa073", LG = "#ccdbb2", CR = "#f5ead8", TC = "#8c491a", TL = "#ffc6a5", INK = "#201e1d";

// ---- Individual characters ---------------------------------------------------------------------------------------------
// The owner's wallet picks the traits (skin, eyes, mouth, freckles, glasses, colour palette). The traits stay the same at every tier,
// so each person's Eco Warrior is recognisably theirs as it levels up. No wallet => the default character.
type Traits = { skin: string; cheek: string; eyes: number; mouth: number; freckles: boolean; glasses: boolean; pal: number };
/** Tiny deterministic hash (FNV-1a, 4 lanes) -> 8 bytes. Pure JS so this file can run in the browser too. Not security-relevant: it only picks looks. */
function seedBytes(str: string): number[] {
  const out: number[] = [];
  for (let lane = 0; lane < 4; lane++) {
    let h = (0x811c9dc5 ^ (lane * 0x9e3779b1)) >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h ^= h >>> 12;
    out.push(h & 255, (h >>> 8) & 255);
  }
  return out;
}
const SKINS = ["#f5ead8", "#f3d9b8", "#e8c39a", "#cf9f73", "#a9744d", "#7c5232"];
export function traitsFor(seed?: string): Traits {
  if (!seed) return { skin: SKINS[0], cheek: TL, eyes: 0, mouth: 0, freckles: false, glasses: false, pal: 0 };
  const b = seedBytes(`ecoproof:nft:v1:${seed}`);
  const skin = b[1] % SKINS.length;
  return { skin: SKINS[skin], cheek: skin >= 4 ? "#ff9a76" : TL, eyes: b[2] % 3, mouth: b[3] % 3, freckles: b[4] % 3 === 0, glasses: b[5] % 5 === 0, pal: b[0] % 4 };
}
// Colour palettes (4 per tier) picked by `pal`: [background from, background to, leaf, leaf2, tunic]
const PAL_SEEDLING = [[LG, SG, SG, MG, MG], ["#f7e3b0", "#e8c37a", "#d9b43c", "#a8841a", "#7b5b2e"], ["#cfe6e0", "#8fbfb6", "#7fbf9f", "#3f8b6c", "#3d6a5c"], ["#f3d6d0", "#d9a39a", "#e49ab0", "#b86480", "#7a4a58"]];
const PAL_SPROUT = [[SG, MG, LG, SG, MG], ["#b98f4a", "#7a5a2d", "#f0dc9a", "#d9b43c", "#7b5b2e"], ["#6fa8a0", "#2f6a63", "#bfe3d6", "#7fbf9f", "#2f5f55"], ["#c7798d", "#7a3f55", "#f3c4d0", "#e49ab0", "#6b3447"]];
const PAL_GUARDIAN = [[MG, DG, LG, GL, SG], ["#6b4c24", "#2a1c0a", "#f0dc9a", GL, "#a07b3c"], ["#2f6a63", "#10302c", "#bfe3d6", GL, "#5a9d8f"], ["#6b2f45", "#2b1019", "#f3c4d0", GL, "#a8566f"]];
const CLOAK_LEGEND = [TC, "#5a2d6b", "#1f4e79", "#7a1f2b"];

const leaf = (x: number, y: number, rot: number, s: number, fill: string, vein = true) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0C-26-10-26-52 0-70 26-52 26-10 0 0z" fill="${fill}" stroke="${DG}" stroke-width="${(3 / s).toFixed(2)}" stroke-linejoin="round"/>${vein ? `<path d="M0-6V-56" stroke="${DG}" stroke-width="${(2.5 / s).toFixed(2)}" stroke-linecap="round" opacity=".55"/>` : ""}</g>`;
const star = (x: number, y: number, r: number, fill = GL) => { const pts = Array.from({ length: 10 }, (_, i) => { const a = (Math.PI / 5) * i - Math.PI / 2, rr = i % 2 ? r * 0.42 : r; return `${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`; }).join(" "); return `<polygon points="${pts}" fill="${fill}" stroke="${GD}" stroke-width="1.5" stroke-linejoin="round"/>`; };
const hex = (x: number, y: number, r: number) => `<polygon points="${Array.from({ length: 6 }, (_, i) => `${(x + r * Math.cos(Math.PI / 3 * i + Math.PI / 6)).toFixed(1)},${(y + r * Math.sin(Math.PI / 3 * i + Math.PI / 6)).toFixed(1)}`).join(" ")}" fill="none" stroke="${GL}" stroke-width="2" opacity=".35"/>`;

function face(t: Traits): string {
  const eyeY = 254;
  const eyes = t.eyes === 1
    ? `<path d="M222 ${eyeY + 4}q12-14 24 0M266 ${eyeY + 4}q12-14 24 0" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`
    : t.eyes === 2
      ? `<circle cx="234" cy="${eyeY}" r="10" fill="${INK}"/><circle cx="278" cy="${eyeY}" r="10" fill="${INK}"/><circle cx="238" cy="${eyeY - 4}" r="3.6" fill="#fff"/><circle cx="282" cy="${eyeY - 4}" r="3.6" fill="#fff"/>`
      : `<circle cx="234" cy="${eyeY}" r="7" fill="${INK}"/><circle cx="278" cy="${eyeY}" r="7" fill="${INK}"/><circle cx="236" cy="${eyeY - 3}" r="2.4" fill="#fff"/><circle cx="280" cy="${eyeY - 3}" r="2.4" fill="#fff"/>`;
  const mouth = t.mouth === 1
    ? `<path d="M238 274q18 26 36 0z" fill="${INK}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M247 285q9 8 18 0" fill="#e0707a"/>`
    : t.mouth === 2
      ? `<path d="M242 280q14 9 30-5" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`
      : `<path d="M240 278q16 14 32 0" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
  const freckles = t.freckles ? [[224, 274], [232, 280], [240, 272], [272, 272], [280, 280], [288, 274]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="${TC}" opacity=".55"/>`).join("") : "";
  const glasses = t.glasses ? `<circle cx="234" cy="${eyeY}" r="17" fill="none" stroke="${INK}" stroke-width="3.5"/><circle cx="278" cy="${eyeY}" r="17" fill="none" stroke="${INK}" stroke-width="3.5"/><path d="M251 ${eyeY}h10" stroke="${INK}" stroke-width="3.5"/>` : "";
  return `<circle cx="256" cy="262" r="64" fill="${t.skin}" stroke="${DG}" stroke-width="4"/><circle cx="231" cy="270" r="10" fill="${t.cheek}" opacity=".6"/><circle cx="281" cy="270" r="10" fill="${t.cheek}" opacity=".6"/>${freckles}${eyes}${glasses}${mouth}`;
}
const body = (fill: string) => `<path d="M180 444c0-72 28-126 76-126s76 54 76 126z" fill="${fill}" stroke="${DG}" stroke-width="4" stroke-linejoin="round"/><path d="M232 332q24 16 48 0" fill="none" stroke="${DG}" stroke-width="4" stroke-linecap="round" opacity=".55"/>`;
const arms = (fill: string) => `<path d="M190 366q-34 18-40 52" fill="none" stroke="${fill}" stroke-width="22" stroke-linecap="round"/><path d="M322 366q34 18 40 52" fill="none" stroke="${fill}" stroke-width="22" stroke-linecap="round"/><circle cx="150" cy="420" r="13" fill="${CR}" stroke="${DG}" stroke-width="3"/><circle cx="362" cy="420" r="13" fill="${CR}" stroke="${DG}" stroke-width="3"/>`;
const plaque = (text: string, gold: boolean) => `<rect x="86" y="452" width="340" height="42" rx="21" fill="${gold ? DG : CR}" stroke="${gold ? G : DG}" stroke-width="3"/><text x="256" y="480" text-anchor="middle" font-family="Figtree,system-ui,Arial,sans-serif" font-size="22" font-weight="800" fill="${gold ? GL : DG}">${text}</text>`;
const frame = (c: string, w: number) => `<rect x="8" y="8" width="496" height="496" rx="40" fill="none" stroke="${c}" stroke-width="${w}"/>`;

/** `labels: false` leaves out every <text> (plaque and count badge). Used where the SVG is rasterised without fonts (Vercel's og renderer), which would draw empty boxes. */
export function artSvg(st: NftStats, opts: { labels?: boolean } = {}): string {
  const svg = artSvgFull(st);
  return opts.labels === false ? svg.replace(/<text\b[\s\S]*?<\/text>/g, "") : svg;
}

function artSvgFull(st: NftStats): string {
  const t = traitsFor(st.seed);
  const tier = tierFor(st.milestone).key;
  const label = `${tierFor(st.milestone).name} · ${milestoneLabel(st.milestone)}`;
  const head = (inner: string, bg: string, defs = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Eco ${label}"><title>Eco ${label}</title><defs>${bg}${defs}</defs>`;
  let art = "";

  const PS = PAL_SEEDLING[t.pal], PP = PAL_SPROUT[t.pal], PG = PAL_GUARDIAN[t.pal];

  if (tier === "seedling") {
    art = head("", `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${PS[0]}"/><stop offset="1" stop-color="${PS[1]}"/></linearGradient>`)
      + `<rect width="512" height="512" fill="url(#bg)"/>${frame(PS[4], 6)}`
      + [[90, 110, 6], [430, 150, 5], [120, 330, 4], [410, 330, 7]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${CR}" opacity=".6"/>`).join("")
      + `<ellipse cx="256" cy="442" rx="130" ry="16" fill="${DG}" opacity=".18"/>${body(PS[4])}${face(t)}`
      + `<path d="M256 198v-34" stroke="${DG}" stroke-width="7" stroke-linecap="round"/>${leaf(256, 168, -52, 0.62, PS[2])}${leaf(256, 168, 52, 0.62, PS[3])}`
      + plaque(label, false) + `</svg>`;
  } else if (tier === "sprout") {
    art = head("", `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${PP[0]}"/><stop offset="1" stop-color="${PP[1]}"/></linearGradient>`)
      + `<rect width="512" height="512" fill="url(#bg)"/>${frame(CR, 6)}`
      + [[84, 120], [430, 110], [96, 300], [420, 250]].map(([x, y]) => star(x, y, 13, CR)).join("")
      + `<ellipse cx="256" cy="442" rx="140" ry="16" fill="${DG}" opacity=".22"/>${body(PP[4])}`
      + [0, 1, 2, 3].map((i) => leaf(222 + i * 22, 372 + (i % 2) * 26, i % 2 ? 12 : -12, 0.42, i % 2 ? PP[3] : PP[2], false)).join("")
      + arms(PP[4]) + face(t)
      + `<path d="M196 214q60-44 120 0" fill="none" stroke="${DG}" stroke-width="12" stroke-linecap="round"/>${leaf(214, 204, -60, 0.5, PP[2])}${leaf(256, 186, 0, 0.55, PP[3])}${leaf(298, 204, 60, 0.5, PP[2])}`
      + `<g transform="translate(362 420) rotate(10)"><rect x="-16" y="-62" width="32" height="76" rx="12" fill="${CR}" stroke="${DG}" stroke-width="4"/><rect x="-11" y="-76" width="22" height="16" rx="5" fill="${G}" stroke="${DG}" stroke-width="3"/><path d="M-9-30h18M-9-18h18" stroke="${SG}" stroke-width="4" stroke-linecap="round"/></g>`
      + plaque(label, false) + `</svg>`;
  } else if (tier === "guardian") {
    const hexes = Array.from({ length: 7 }, (_, r) => Array.from({ length: 6 }, (_, c) => hex(40 + c * 86 + (r % 2) * 43, 50 + r * 74, 40)).join("")).join("");
    art = head("", `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PG[0]}"/><stop offset="1" stop-color="${PG[1]}"/></linearGradient>`)
      + `<rect width="512" height="512" fill="url(#bg)"/>${hexes}${frame(G, 7)}`
      + `<path d="M178 350L130 452h252L334 350z" fill="${G}" stroke="${DG}" stroke-width="4" stroke-linejoin="round"/><g opacity=".45">${[[190, 410], [236, 410], [282, 410], [328, 410], [213, 440], [259, 440], [305, 440]].map(([x, y]) => `<polygon points="${[0, 1, 2, 3, 4, 5].map((i) => `${(x + 18 * Math.cos(Math.PI / 3 * i + Math.PI / 6)).toFixed(1)},${(y + 18 * Math.sin(Math.PI / 3 * i + Math.PI / 6)).toFixed(1)}`).join(" ")}" fill="none" stroke="${GD}" stroke-width="2.5"/>`).join("")}</g>`
      + body(PG[4]) + `<path d="M180 352q-8 36 22 44M332 352q8 36-22 44" fill="none" stroke="${DG}" stroke-width="4"/>`
      + leaf(176, 350, -70, 0.5, PG[2]) + leaf(336, 350, 70, 0.5, PG[2]) + arms(PG[4]) + face(t)
      + [-2, -1, 0, 1, 2].map((i) => leaf(256 + i * 28, 206 - Math.abs(i) * -6 - 4, i * 24, 0.46, i % 2 ? PG[2] : PG[3])).join("")
      + `<g><rect x="96" y="150" width="12" height="320" rx="6" fill="${G}" stroke="${DG}" stroke-width="3"/>${[200, 270, 340, 410].map((y) => `<rect x="93" y="${y}" width="18" height="7" rx="3" fill="${GD}"/>`).join("")}${leaf(102, 160, 0, 0.7, PG[2])}</g>`
      + plaque(label, false) + `</svg>`;
  } else {
    const n = st.milestone;
    const rays = 14 + Math.min(10, Math.floor(Math.log2(Math.max(25, n) / 25)) * 4);
    const stars = Math.min(9, 4 + Math.floor(n / 50));
    const rayPath = Array.from({ length: rays }, (_, i) => { const a = (i / rays) * Math.PI * 2, w = Math.PI / rays * 0.55; const f = (ang: number, r: number) => `${(256 + r * Math.cos(ang)).toFixed(1)},${(236 + r * Math.sin(ang)).toFixed(1)}`; return `<polygon points="256,236 ${f(a - w, 330)} ${f(a + w, 330)}" fill="${GL}" opacity="${i % 2 ? 0.16 : 0.28}"/>`; }).join("");
    art = head("", `<radialGradient id="bg" cx=".5" cy=".46" r=".75"><stop offset="0" stop-color="${G}"/><stop offset=".55" stop-color="${GD}"/><stop offset="1" stop-color="${DG}"/></radialGradient>`)
      + `<rect width="512" height="512" fill="url(#bg)"/>${rayPath}${frame(GL, 9)}${frame(DG, 2)}`
      + Array.from({ length: stars }, (_, i) => { const a = Math.PI * (1.05 + (0.9 * i) / Math.max(1, stars - 1)); return star(256 + 215 * Math.cos(a), 250 + 190 * Math.sin(a) + 40, i % 2 ? 11 : 15); }).join("")
      + `<circle cx="256" cy="262" r="96" fill="none" stroke="${GL}" stroke-width="5" opacity=".7"/><circle cx="256" cy="262" r="108" fill="none" stroke="${GL}" stroke-width="2" stroke-dasharray="3 9" stroke-linecap="round"/>`
      + `<path d="M170 346L116 452h280L342 346z" fill="${CLOAK_LEGEND[t.pal]}" stroke="${DG}" stroke-width="4" stroke-linejoin="round"/><path d="M170 346L116 452h60z" fill="${GD}" opacity=".5"/>`
      + body(G) + `<path d="M226 372l30 20 30-20" fill="none" stroke="${DG}" stroke-width="4" stroke-linecap="round"/>` + leaf(176, 352, -72, 0.55, GL) + leaf(336, 352, 72, 0.55, GL) + arms(G) + face(t)
      + `<path d="M196 206l-8-52 34 26 34-44 34 44 34-26-8 52z" fill="${G}" stroke="${DG}" stroke-width="4" stroke-linejoin="round"/><circle cx="256" cy="150" r="9" fill="${TC}" stroke="${DG}" stroke-width="3"/><circle cx="188" cy="152" r="7" fill="${SG}" stroke="${DG}" stroke-width="3"/><circle cx="324" cy="152" r="7" fill="${SG}" stroke="${DG}" stroke-width="3"/>`
      + `<g><rect x="400" y="140" width="12" height="330" rx="6" fill="${GL}" stroke="${DG}" stroke-width="3"/><circle cx="406" cy="132" r="22" fill="${CR}" stroke="${DG}" stroke-width="4"/><circle cx="406" cy="132" r="11" fill="${SG}"/></g>`
      + (n >= 50 ? `<g><circle cx="92" cy="104" r="36" fill="${DG}" stroke="${GL}" stroke-width="4"/><text x="92" y="114" text-anchor="middle" font-family="Figtree,system-ui,Arial,sans-serif" font-size="${n >= 100 ? 24 : 28}" font-weight="900" fill="${GL}">${n}</text></g>` : "")
      + plaque(label, true) + `</svg>`;
  }
  return art;
}
