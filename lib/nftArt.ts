import { milestoneLabel, tierFor } from "./milestoneRules";

export type NftStats = { milestone: number; proofs: number; plasticItems: number; co2Kg: number; brand: string };

// Code-drawn, deterministic artwork: four tiers that visibly level up (Seedling -> Sprout -> Guardian -> Legend).
// Same input => same SVG, so the image never depends on an external model or service. Legend scales with the milestone.
const G = "#e8a317", GL = "#f7d27a", GD = "#a86f00"; // honey gold
const DG = "#272e1b", MG = "#56633f", SG = "#8fa073", LG = "#ccdbb2", CR = "#f5ead8", TC = "#8c491a", TL = "#ffc6a5", INK = "#201e1d";

const leaf = (x: number, y: number, rot: number, s: number, fill: string, vein = true) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0C-26-10-26-52 0-70 26-52 26-10 0 0z" fill="${fill}" stroke="${DG}" stroke-width="${(3 / s).toFixed(2)}" stroke-linejoin="round"/>${vein ? `<path d="M0-6V-56" stroke="${DG}" stroke-width="${(2.5 / s).toFixed(2)}" stroke-linecap="round" opacity=".55"/>` : ""}</g>`;
const star = (x: number, y: number, r: number, fill = GL) => { const pts = Array.from({ length: 10 }, (_, i) => { const a = (Math.PI / 5) * i - Math.PI / 2, rr = i % 2 ? r * 0.42 : r; return `${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`; }).join(" "); return `<polygon points="${pts}" fill="${fill}" stroke="${GD}" stroke-width="1.5" stroke-linejoin="round"/>`; };
const hex = (x: number, y: number, r: number) => `<polygon points="${Array.from({ length: 6 }, (_, i) => `${(x + r * Math.cos(Math.PI / 3 * i + Math.PI / 6)).toFixed(1)},${(y + r * Math.sin(Math.PI / 3 * i + Math.PI / 6)).toFixed(1)}`).join(" ")}" fill="none" stroke="${GL}" stroke-width="2" opacity=".35"/>`;

function face(): string {
  return `<circle cx="256" cy="262" r="64" fill="${CR}" stroke="${DG}" stroke-width="4"/><circle cx="231" cy="268" r="10" fill="${TL}" opacity=".7"/><circle cx="281" cy="268" r="10" fill="${TL}" opacity=".7"/><circle cx="234" cy="254" r="7" fill="${INK}"/><circle cx="278" cy="254" r="7" fill="${INK}"/><circle cx="236" cy="251" r="2.4" fill="#fff"/><circle cx="280" cy="251" r="2.4" fill="#fff"/><path d="M240 278q16 14 32 0" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
}
const body = (fill: string) => `<path d="M186 440c0-58 22-98 70-98s70 40 70 98z" fill="${fill}" stroke="${DG}" stroke-width="4" stroke-linejoin="round"/><path d="M226 342q30 22 60 0" fill="${CR}" stroke="${DG}" stroke-width="4"/>`;
const arms = (fill: string) => `<path d="M190 366q-34 18-40 52" fill="none" stroke="${fill}" stroke-width="22" stroke-linecap="round"/><path d="M322 366q34 18 40 52" fill="none" stroke="${fill}" stroke-width="22" stroke-linecap="round"/><circle cx="150" cy="420" r="13" fill="${CR}" stroke="${DG}" stroke-width="3"/><circle cx="362" cy="420" r="13" fill="${CR}" stroke="${DG}" stroke-width="3"/>`;
const plaque = (text: string, gold: boolean) => `<rect x="86" y="452" width="340" height="42" rx="21" fill="${gold ? DG : CR}" stroke="${gold ? G : DG}" stroke-width="3"/><text x="256" y="480" text-anchor="middle" font-family="Figtree,system-ui,Arial,sans-serif" font-size="22" font-weight="800" fill="${gold ? GL : DG}">${text}</text>`;
const frame = (c: string, w: number) => `<rect x="8" y="8" width="496" height="496" rx="40" fill="none" stroke="${c}" stroke-width="${w}"/>`;

/** `labels: false` leaves out every <text> (plaque and count badge). Used where the SVG is rasterised without fonts (Vercel's og renderer), which would draw empty boxes. */
export function artSvg(st: NftStats, opts: { labels?: boolean } = {}): string {
  const svg = artSvgFull(st);
  return opts.labels === false ? svg.replace(/<text\b[\s\S]*?<\/text>/g, "") : svg;
}

function artSvgFull(st: NftStats): string {
  const tier = tierFor(st.milestone).key;
  const label = `${tierFor(st.milestone).name} · ${milestoneLabel(st.milestone)}`;
  const head = (inner: string, bg: string, defs = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Eco ${label}"><title>Eco ${label}</title><defs>${bg}${defs}</defs>`;
  let art = "";

  if (tier === "seedling") {
    art = head("", `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${LG}"/><stop offset="1" stop-color="${SG}"/></linearGradient>`)
      + `<rect width="512" height="512" fill="url(#bg)"/>${frame(MG, 6)}`
      + [[90, 110, 6], [430, 150, 5], [120, 330, 4], [410, 330, 7]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${CR}" opacity=".6"/>`).join("")
      + `<ellipse cx="256" cy="442" rx="130" ry="16" fill="${DG}" opacity=".18"/>${body(MG)}${face()}`
      + `<path d="M256 198v-34" stroke="${DG}" stroke-width="7" stroke-linecap="round"/>${leaf(256, 168, -52, 0.62, SG)}${leaf(256, 168, 52, 0.62, MG)}`
      + plaque(label, false) + `</svg>`;
  } else if (tier === "sprout") {
    art = head("", `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${SG}"/><stop offset="1" stop-color="${MG}"/></linearGradient>`)
      + `<rect width="512" height="512" fill="url(#bg)"/>${frame(CR, 6)}`
      + [[84, 120], [430, 110], [96, 300], [420, 250]].map(([x, y]) => star(x, y, 13, CR)).join("")
      + `<ellipse cx="256" cy="442" rx="140" ry="16" fill="${DG}" opacity=".22"/>${body(MG)}`
      + [0, 1, 2, 3].map((i) => leaf(222 + i * 22, 372 + (i % 2) * 26, i % 2 ? 12 : -12, 0.42, i % 2 ? SG : LG, false)).join("")
      + arms(MG) + face()
      + `<path d="M196 214q60-44 120 0" fill="none" stroke="${DG}" stroke-width="12" stroke-linecap="round"/>${leaf(214, 204, -60, 0.5, LG)}${leaf(256, 186, 0, 0.55, SG)}${leaf(298, 204, 60, 0.5, LG)}`
      + `<g transform="translate(362 420) rotate(10)"><rect x="-16" y="-62" width="32" height="76" rx="12" fill="${CR}" stroke="${DG}" stroke-width="4"/><rect x="-11" y="-76" width="22" height="16" rx="5" fill="${G}" stroke="${DG}" stroke-width="3"/><path d="M-9-30h18M-9-18h18" stroke="${SG}" stroke-width="4" stroke-linecap="round"/></g>`
      + plaque(label, false) + `</svg>`;
  } else if (tier === "guardian") {
    const hexes = Array.from({ length: 7 }, (_, r) => Array.from({ length: 6 }, (_, c) => hex(40 + c * 86 + (r % 2) * 43, 50 + r * 74, 40)).join("")).join("");
    art = head("", `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${MG}"/><stop offset="1" stop-color="${DG}"/></linearGradient>`)
      + `<rect width="512" height="512" fill="url(#bg)"/>${hexes}${frame(G, 7)}`
      + `<path d="M178 350L130 452h252L334 350z" fill="${G}" stroke="${DG}" stroke-width="4" stroke-linejoin="round"/><g opacity=".45">${[[190, 410], [236, 410], [282, 410], [328, 410], [213, 440], [259, 440], [305, 440]].map(([x, y]) => `<polygon points="${[0, 1, 2, 3, 4, 5].map((i) => `${(x + 18 * Math.cos(Math.PI / 3 * i + Math.PI / 6)).toFixed(1)},${(y + 18 * Math.sin(Math.PI / 3 * i + Math.PI / 6)).toFixed(1)}`).join(" ")}" fill="none" stroke="${GD}" stroke-width="2.5"/>`).join("")}</g>`
      + body(SG) + `<path d="M180 352q-8 36 22 44M332 352q8 36-22 44" fill="none" stroke="${DG}" stroke-width="4"/>`
      + leaf(176, 350, -70, 0.5, LG) + leaf(336, 350, 70, 0.5, LG) + arms(SG) + face()
      + [-2, -1, 0, 1, 2].map((i) => leaf(256 + i * 28, 206 - Math.abs(i) * -6 - 4, i * 24, 0.46, i % 2 ? LG : GL)).join("")
      + `<g><rect x="96" y="150" width="12" height="320" rx="6" fill="${G}" stroke="${DG}" stroke-width="3"/>${[200, 270, 340, 410].map((y) => `<rect x="93" y="${y}" width="18" height="7" rx="3" fill="${GD}"/>`).join("")}${leaf(102, 160, 0, 0.7, LG)}</g>`
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
      + `<path d="M170 346L116 452h280L342 346z" fill="${TC}" stroke="${DG}" stroke-width="4" stroke-linejoin="round"/><path d="M170 346L116 452h60z" fill="${GD}" opacity=".5"/>`
      + body(G) + `<path d="M226 372l30 20 30-20" fill="none" stroke="${DG}" stroke-width="4" stroke-linecap="round"/>` + leaf(176, 352, -72, 0.55, GL) + leaf(336, 352, 72, 0.55, GL) + arms(G) + face()
      + `<path d="M196 206l-8-52 34 26 34-44 34 44 34-26-8 52z" fill="${G}" stroke="${DG}" stroke-width="4" stroke-linejoin="round"/><circle cx="256" cy="150" r="9" fill="${TC}" stroke="${DG}" stroke-width="3"/><circle cx="188" cy="152" r="7" fill="${SG}" stroke="${DG}" stroke-width="3"/><circle cx="324" cy="152" r="7" fill="${SG}" stroke="${DG}" stroke-width="3"/>`
      + `<g><rect x="400" y="140" width="12" height="330" rx="6" fill="${GL}" stroke="${DG}" stroke-width="3"/><circle cx="406" cy="132" r="22" fill="${CR}" stroke="${DG}" stroke-width="4"/><circle cx="406" cy="132" r="11" fill="${SG}"/></g>`
      + (n >= 50 ? `<g><circle cx="92" cy="104" r="36" fill="${DG}" stroke="${GL}" stroke-width="4"/><text x="92" y="114" text-anchor="middle" font-family="Figtree,system-ui,Arial,sans-serif" font-size="${n >= 100 ? 24 : 28}" font-weight="900" fill="${GL}">${n}</text></g>` : "")
      + plaque(label, true) + `</svg>`;
  }
  return art;
}
