"use client";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BedDouble, Coffee, Compass, Gift, Mail, Package, ReceiptText, Store, Utensils, type LucideIcon } from "lucide-react";
import { AFTER_SUMMIT_EVERY_SCAN, AREA_COLOUR, BOARD_LAND, BOARD_PORT, DRAW_AT, EXPLORER_AT, layoutJourney, MAX_NFTS, stepOf, TERRAIN, type Decor, type JourneyStation, type Terrain } from "@/lib/journeyMap";
import { RANKS, rankWebp, tierFor } from "@/lib/milestoneRules";
import { seasonCardOf } from "@/lib/seasonRules";
import { explorerAsset, NFT_STATE_LABEL, nftState } from "@/lib/passportView";
import { POINTS_BY_KIND, POINTS_CARD, POINTS_VERIFIED } from "@/lib/stampClasses";
import { useDesktop } from "@/lib/desktop";
import type { Nft, SeasonNft } from "@/lib/milestones";
import type { PassportStep } from "@/lib/passport";

// The journey map at the top of the passport: an illustrated game board (Pola, 2026-11-20). A green land drawn in SVG, from the hive
// village over forest, shore and hills to the summit, with one trail winding up it: a small stepping stone per eco point (they carry
// nothing, so they stay small), a tile where a card is given, one station per rank (the Bee Guardian NFT once earned, a silhouette
// before), the bee on the point the person has reached, and a camp of signposts, one per way to take a step. Landscape on desktop,
// a separate portrait board on phones. The ground, its decoration and the landmarks all follow the trail (lib/journeyMap.ts), so they
// move with the ranks (lib/milestoneRules.ts); points come from lib/stampClasses.ts. Each area's landmark is a painted cut-out
// (public/journey/<version>/<terrain>.webp, recipe in art/board/landmarks.py); everything else is drawn here.
//
// Motion (Pola, 2026-11-19: the board should visibly live). On every visit the tiles come in along the trail and the bee walks the
// last steps to its point (all the new steps when the points went up since this device last showed the map), the road fills behind
// it, a stamp is pressed on each tile it passes and a station it reaches pops. At rest the bee bobs and the next goal (the next
// station or random-card tile) breathes. Pointing at a tile or station (or tapping it) lifts it and opens a small note that says
// what happens there. Web Animations and CSS on transform and opacity only (and the road's dash), with the app's strong ease-in-out
// for on-screen movement and its strong ease-out for entrances; the classes are `jm-*` in app/globals.css. Reduced motion: no walk,
// no bob, no breathing, no lift; everything shows its final state, a station fades in and the note only fades.

const SEEN_KEY = "ecoproof:journey:step"; // the last step this device showed; a per-viewer convenience, never needed
const EASE_MOVE = "cubic-bezier(0.77, 0, 0.175, 1)";
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const INK = "#3a2a1c", PAPER = "#f4e9d8", HONEY = "#e08a2e", HONEY_DEEP = "#b96a1d";
const SKY_INK = "#36557c"; // stamp ink (DESIGN.md: sky ink is the colour of stamps)
/** How many steps the bee walks in on a visit without new points. */
const WALK_IN = 5;
const TILE_REST = { fill: PAPER, stroke: "rgba(58,42,28,0.45)" }, TILE_DONE = { fill: "#fffaf0", stroke: "rgba(58,42,28,0.45)" };
const SEA = "#a8d0d6", RIM = "#f3e6c0";
const GROUND: Record<Terrain, string> = { meadow: "#cfdc93", forest: "#9dbb73", shore: "#efdcae", hills: "#d6d283", summit: "#d3c7b6" };
const LANDMARKS = "/journey/v1"; // a new folder whenever a deployed picture changes, so caches bust
// A painted map of the whole land, where one exists for a board (art/board: guide.py, paint.py, zones.py); it replaces the drawn ground, decoration and
// landmarks. First version 2026-11-20, both boards, made for today's ranks (the painting does not move when a rank changes; the trail on top of it does).
const PAINTED: { land?: string; port?: string } = { land: "/journey/v9/land.webp", port: "/journey/v9/port.webp" };
const OUTLINE = "rgba(58,42,28,0.6)";

/** One small drawing on the ground (a tree, a hive, a parasol ...), drawn in a 20 x 20 box around its spot and scaled to its size. */
function Deco({ d }: { d: Decor }) {
  const k = d.s / 20, sw = 1.1 / k, flip = d.r > 0.5 ? -1 : 1;
  const ink = { stroke: OUTLINE, strokeWidth: sw, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const body = (() => {
    switch (d.kind) {
      case "flower": { const c = d.r < 0.34 ? "#ffffff" : d.r < 0.67 ? "#f6c544" : "#e9853a"; return <>{[0, 1, 2, 3, 4].map((i) => { const a = (i * 2 * Math.PI) / 5; return <circle key={i} cx={(Math.cos(a) * 4.6).toFixed(2)} cy={(Math.sin(a) * 4.6).toFixed(2)} r={3.4} fill={c} {...ink} />; })}<circle r={2.6} fill="#8f4c10" /></>; }
      case "tuft": return <path d="M-4 5 Q-5 -1 -7 -4 M0 5 Q0 -3 0 -7 M4 5 Q5 -1 7 -4" fill="none" stroke="#5f8f4e" strokeWidth={2 / k > 2.4 ? 2.4 : 1.8} strokeLinecap="round" />;
      case "hive": return <><path d="M-8 8 Q-9.5 -2 -4.5 -7 Q0 -10.5 4.5 -7 Q9.5 -2 8 8 Z" fill="#e7bd62" {...ink} /><path d="M-8.2 3 H8.2 M-7.4 -2 H7.4 M-5 -6.4 H5" fill="none" stroke="#b9862f" strokeWidth={sw} /><path d="M-2.6 8 V4.2 Q0 1 2.6 4.2 V8 Z" fill="#5a3a1c" /></>;
      case "tree": return <><rect x={-1.6} y={3} width={3.2} height={6.5} fill="#8a5a33" {...ink} /><circle cy={-2} r={7.4} fill={d.r < 0.5 ? "#5f9a4f" : "#6fa85a"} {...ink} /><circle cx={-2.6} cy={-4.4} r={3} fill="#8cc06f" /></>;
      case "bush": return <><path d="M-8 6 Q-10 0 -5 -1 Q-5 -7 0 -6 Q5 -7 5 -1 Q10 0 8 6 Z" fill="#74a95c" {...ink} /><circle cx={-2} cy={-1.5} r={1.8} fill="#9ccc80" /></>;
      case "palm": return <><path d="M0 9 Q2 2 0 -3" fill="none" stroke="#9a6b3c" strokeWidth={2.4} strokeLinecap="round" /><path d="M0 -3 Q-5 -9 -10 -4 M0 -3 Q-4 -3 -8 3 M0 -3 Q5 -9 10 -4 M0 -3 Q4 -3 8 3 M0 -3 Q0 -8 1.5 -10" fill="none" stroke="#4f8f4a" strokeWidth={2.6} strokeLinecap="round" /></>;
      case "parasol": return <><circle r={8.4} fill="#fff3d6" {...ink} />{[0, 2, 4, 6].map((i) => { const a = (i * Math.PI) / 4, b = ((i + 1) * Math.PI) / 4; return <path key={i} d={`M0 0 L${(Math.cos(a) * 8.4).toFixed(2)} ${(Math.sin(a) * 8.4).toFixed(2)} A8.4 8.4 0 0 1 ${(Math.cos(b) * 8.4).toFixed(2)} ${(Math.sin(b) * 8.4).toFixed(2)} Z`} fill={d.r < 0.5 ? "#d9603a" : "#e08a2e"} />; })}<circle r={8.4} fill="none" {...ink} /><circle r={1.4} fill={INK} /></>;
      case "shell": return <><path d="M-7 4 A7 7 0 0 1 7 4 Z" fill="#fff6e0" {...ink} /><path d="M0 4 V-2.6 M-3.4 4 L-4.6 -0.6 M3.4 4 L4.6 -0.6" fill="none" stroke={OUTLINE} strokeWidth={sw * 0.8} /></>;
      case "terrace": return <><ellipse cy={1.5} rx={10} ry={7.4} fill="#c2d072" {...ink} /><path d="M-8.4 4.4 Q0 -1.4 8.4 4.4 M-7 -0.2 Q0 -5.4 7 -0.2" fill="none" stroke="#86a246" strokeWidth={sw * 1.5} strokeLinecap="round" /></>;
      case "field": return <g transform={`rotate(${Math.round((d.r - 0.5) * 36)})`}><rect x={-9} y={-6} width={18} height={12} rx={2} fill={d.r < 0.5 ? "#ecc95f" : "#b9cf6c"} {...ink} /><path d="M-9 -2 H9 M-9 2 H9" fill="none" stroke="rgba(58,42,28,0.3)" strokeWidth={sw} /></g>;
      case "rock": return <><path d="M-8 6 L-9 0 L-3 -7 L4 -6 L9 1 L7 6 Z" fill="#a99c8c" {...ink} /><path d="M-3 -7 L-1 -1 L-9 0 M-1 -1 L4 -6" fill="none" stroke={OUTLINE} strokeWidth={sw * 0.8} /></>;
      case "pine": return <><rect x={-1.4} y={5} width={2.8} height={4.6} fill="#8a5a33" {...ink} /><path d="M0 -3 L-7.6 6 H7.6 Z" fill="#3f7a4f" {...ink} /><path d="M0 -10 L-5.6 -1 H5.6 Z" fill="#4a8a5a" {...ink} /></>;
      case "snow": return <path d="M-9 2 Q-10 -4 -3 -4 Q0 -8 5 -4 Q11 -3 9 3 Q4 7 -3 5 Q-8 6 -9 2 Z" fill="#fcfcf7" stroke="rgba(58,42,28,0.25)" strokeWidth={sw} />;
      default: return <path d="M-9 1 Q-6 -3 -3 1 Q0 5 3 1 Q6 -3 9 1" fill="none" stroke="#ffffff" strokeOpacity={0.85} strokeWidth={1.8 / k} strokeLinecap="round" />;
    }
  })();
  return <g transform={`translate(${d.x} ${d.y}) scale(${(k * flip).toFixed(3)} ${k.toFixed(3)})`}>{body}</g>;
}

/** When the eased walk (the curve above) has covered the fraction `t` of the way, as a fraction of its duration: the delay for the tile at that spot. */
function timeAt(t: number) {
  const bez = (a: number, b: number, s: number) => 3 * (1 - s) * (1 - s) * s * a + 3 * (1 - s) * s * s * b + s * s * s;
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (bez(0, 1, mid) < t) lo = mid; else hi = mid; } // y(s) = t
  return bez(0.77, 0.175, (lo + hi) / 2);
}

/** The EcoProof stamp pressed on every reached stone: a ring around a tick in stamp ink, tilted a little differently each time. */
function Stamp({ x, y, size, n }: { x: number; y: number; size: number; n: number }) {
  const r = size * 0.3, tilt = ((n * 37) % 17) - 8; // -8 to 8 degrees, the same for a given point on every visit
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt})`} fill="none" stroke={SKY_INK} strokeLinecap="round" strokeLinejoin="round" opacity={0.92} style={{ mixBlendMode: "multiply" }}>
      <circle r={r} strokeWidth={Math.max(1.2, size * 0.07)} />
      <path d={`M${-r * 0.5} ${r * 0.02} L${-r * 0.12} ${r * 0.42} L${r * 0.54} ${-r * 0.38}`} strokeWidth={Math.max(1.4, size * 0.09)} />
    </g>
  );
}

/** `phoneTitle`: a shorter title below the desktop breakpoint. A sign's title never wraps; the line under it may (Pola, 2026-11-20). */
type Sign = { id: string; Icon: LucideIcon; title: string; note: string; phoneTitle?: string; /** the word on the phone's small tile, when the title is too long for it */ chip?: string; pts: number; act: "scan" | "receipt" | "none" };
const SIGNS: Sign[] = [
  { id: "cafe", Icon: Coffee, title: "Café", note: "QR at the counter", pts: POINTS_BY_KIND.cafe, act: "scan" },
  { id: "restaurant", Icon: Utensils, title: "Restaurant", note: "QR at your table", pts: POINTS_BY_KIND.restaurant, act: "scan" },
  { id: "hotel", Icon: BedDouble, title: "Hotel or resort", phoneTitle: "Hotel", note: "QR at reception, once a day", pts: POINTS_BY_KIND.hotel, act: "scan" },
  { id: "shop", Icon: Store, title: "Eco shop", note: "QR at the till", pts: POINTS_BY_KIND.eco_shop, act: "scan" },
  { id: "card", Icon: Package, title: "Parcel card", note: "Scan the card in your parcel", pts: POINTS_CARD, act: "scan" },
  { id: "order", Icon: Mail, title: "Online order", chip: "Order", note: "Tap the link in your order email", pts: POINTS_VERIFIED, act: "none" },
  { id: "receipt", Icon: ReceiptText, title: "Shop receipt", chip: "Receipt", note: "Photograph it in the shop", pts: POINTS_VERIFIED, act: "receipt" },
];
const ARROW = "[clip-path:polygon(0_0,calc(100%-16px)_0,100%_50%,calc(100%-16px)_100%,0_100%)]";

function Signpost({ s, onScan, onReceipt }: { s: Sign; onScan?: () => void; onReceipt?: () => void }) {
  const verified = s.pts === POINTS_VERIFIED;
  const act = s.act === "scan" ? onScan : s.act === "receipt" ? onReceipt : undefined;
  const [ask, setAsk] = useState(false); // a tap asks first: the signs are easy to hit by accident (Pola, 2026-11-20)
  const cls = `${ARROW} flex min-h-[64px] w-full items-center gap-2.5 py-2 pl-3 pr-7 text-left text-cocoa transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] ${verified ? "bg-honey" : "bg-kraft"} ${act ? "cursor-pointer active:scale-[0.97]" : ""}`;
  const inner = (
    <>
      <s.Icon size={22} strokeWidth={2.2} className="shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block whitespace-nowrap text-[13.5px] font-extrabold">{s.phoneTitle ? <><span className="lg:hidden">{s.phoneTitle}</span><span className="hidden lg:inline">{s.title}</span></> : s.title}</span>
        <span className="block text-[12px] font-semibold">{s.note}</span>
      </span>
      <span className="shrink-0 font-heading text-[19px] leading-none">+{s.pts}</span>
    </>
  );
  if (act && ask) return (
    <div className={`${cls} cursor-default`} role="group" aria-label={`${s.title}: ${s.act === "receipt" ? "photograph a receipt" : "scan"} now?`}>
      <s.Icon size={22} strokeWidth={2.2} className="shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 text-[13.5px] font-extrabold leading-tight">{s.act === "receipt" ? "Photograph a receipt now?" : "Scan now?"}</span>
      <button type="button" autoFocus onClick={() => { setAsk(false); act(); }} className="min-h-11 shrink-0 rounded-full bg-cocoa px-4 text-[13px] font-extrabold text-paper">Yes</button>
      <button type="button" onClick={() => setAsk(false)} className="min-h-11 shrink-0 rounded-full px-2 text-[13px] font-bold underline">No</button>
    </div>
  );
  return act ? <button type="button" onClick={() => setAsk(true)} className={cls}>{inner}</button> : <div className={cls}>{inner}</div>;
}

/** The same seven ways on a phone (Pola, 2026-11-21: the stacked signs took half the screen there): small tiles, four to a row, with the symbol, one word
 *  and the points. A tap opens one line under them with what the sign says in full, and the scan button where there is something to scan, so a stray tap
 *  never opens the camera. */
function StepTiles({ onScan, onReceipt }: { onScan?: () => void; onReceipt?: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const cur = SIGNS.find((x) => x.id === open);
  const act = cur?.act === "scan" ? onScan : cur?.act === "receipt" ? onReceipt : undefined;
  return (
    <div>
      <ul className="grid grid-cols-4 gap-1.5">
        {SIGNS.map((x) => {
          const on = x.id === open;
          return (
            <li key={x.id}>
              <button type="button" aria-expanded={on} aria-controls="jm-step-note" onClick={() => setOpen(on ? null : x.id)}
                className={`flex min-h-[60px] w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-cocoa transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] ${x.pts === POINTS_VERIFIED ? "bg-honey" : "bg-kraft"} ${on ? "ring-2 ring-cocoa" : ""}`}>
                <span className="flex items-center gap-1"><x.Icon size={17} strokeWidth={2.2} aria-hidden /><span className="font-heading text-[15px] leading-none">+{x.pts}</span></span>
                <span className="text-[11.5px] font-extrabold leading-tight">{x.chip ?? x.phoneTitle ?? x.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div id="jm-step-note" aria-live="polite">
        {cur && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2 text-cocoa">
            <p className="min-w-0 flex-1 text-[12.5px] font-semibold leading-snug"><b className="font-extrabold">{cur.title}.</b> {cur.note}. Worth {cur.pts} point{cur.pts === 1 ? "" : "s"}.</p>
            {act && <button type="button" onClick={() => { setOpen(null); act(); }} className="min-h-11 shrink-0 rounded-full bg-cocoa px-4 text-[13px] font-extrabold text-paper">{cur.act === "receipt" ? "Photograph" : "Scan now"}</button>}
          </div>
        )}
      </div>
    </div>
  );
}

const STATE_SHORT = { waiting: "To claim", queued: "Minting soon", minting: "Minting", retrying: "Retrying", onchain: "On Solana" } as const;

export default function PassportMap({ points, toGo, nextTier, nfts, season, steps = [], wallet, ready, owner, onScan, onReceipt }: {
  points: number; toGo: number; nextTier: string; nfts: Nft[];
  /** The Season cards the passport holds: a card drawn at a gift tile is shown on it. */
  season: SeasonNft[]; wallet: boolean;
  /** Which stamp filled which points of the trail (lib/passport.ts): a reached tile's note names its stamp and links to its proof. */
  steps?: PassportStep[];
  /** The passport has arrived from the server; before that the map shows the start and never animates. */
  ready: boolean; owner: boolean; onScan?: () => void; onReceipt?: () => void;
}) {
  const desktop = useDesktop();
  const j = useMemo(() => layoutJourney(desktop ? BOARD_LAND : BOARD_PORT), [desktop]);
  const painted = desktop ? PAINTED.land : PAINTED.port;
  const step = stepOf(points, j.end);
  const here = j.nodes[step];
  const area = step > 0 ? tierFor(step).name : null;
  const total = j.total;
  const [expanded, setExpanded] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const bee = useRef<SVGGElement>(null);
  const trail = useRef<SVGPathElement>(null);
  const handled = useRef<number | null>(null); // the step whose arrival was already played, so a resize or a strict-mode re-run never replays it

  const beeH = Math.round((j.spot + 18) * 1.3), beeW = Math.round(beeH * 0.65); // the full-body bee, 416 x 640 (art/board/pin.py; Pola 2026-11-20: the pin has both legs, not the rank card's cut-off bust)
  const stationFor = (r: JourneyStation) => nfts.find((n) => n.rank === r.key); // the highest edition first

  useLayoutEffect(() => {
    if (!ready) return;
    const centre = (at: number, smooth: boolean) => {
      const box = scroller.current;
      if (!box || box.scrollHeight <= box.clientHeight) return;
      const y = j.nodes[at].y * (box.clientWidth / j.width);
      box.scrollTo({ top: Math.max(0, y - box.clientHeight / 2), behavior: smooth ? "smooth" : "auto" });
    };
    if (handled.current === step) { centre(step, false); return; } // only the layout changed
    handled.current = step;

    let from = step;
    if (owner) {
      try {
        const seen = localStorage.getItem(SEEN_KEY);
        if (seen !== null && Number.isFinite(Number(seen))) from = Math.min(Number(seen), step);
        localStorage.setItem(SEEN_KEY, String(step));
      } catch { /* private window: no memory of the last visit, so no walk */ }
    }
    const news = from < step; // new points since the last visit: the stations on the way pop
    if (!news) from = Math.max(0, step - WALK_IN);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = svg.current;
    if (!reduce) root?.querySelectorAll<SVGGElement>("[data-tile]").forEach((el) => { // the board lays itself out along the trail
      el.animate([{ opacity: 0, transform: "scale(0.92)" }, { opacity: 1, transform: "scale(1)" }], { duration: 220, delay: Number(el.dataset.tile) * 12, easing: EASE_OUT, fill: "backwards" });
    });
    if (from >= step) { centre(step, false); return; }
    const stationEls = root?.querySelectorAll<SVGGElement>("[data-station]") ?? [];
    centre(reduce ? step : from, false);
    if (reduce) { // keep the news, lose the movement: a newly reached station fades in
      if (news) stationEls.forEach((el) => { const at = Number(el.dataset.at); if (at > from && at <= step) el.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 160, easing: "ease", fill: "backwards" }); });
      return;
    }
    const dur = Math.min(1100, 320 + 80 * (step - from)); // a longer walk takes longer, up to about a second
    const walk = { duration: dur, easing: EASE_MOVE };
    bee.current?.animate(j.nodes.slice(from, step + 1).map((p) => ({ transform: `translate(${p.x}px, ${p.y}px)` })), walk);
    trail.current?.animate([{ strokeDasharray: `${j.nodes[from].len} ${total + 10}` }, { strokeDasharray: `${here.len} ${total + 10}` }], walk);
    root?.querySelectorAll<SVGGElement>("[data-stamp]").forEach((el) => { // pressed as the bee passes: lands from a little larger, like a stamp coming down
      const n = Number(el.dataset.stamp);
      if (n > from && n <= step) el.animate([{ opacity: 0, transform: "scale(1.35)" }, { opacity: 1, transform: "scale(1)" }], { duration: 200, delay: dur * timeAt((n - from) / (step - from)), easing: EASE_OUT, fill: "backwards" });
    });
    if (news) stationEls.forEach((el) => {
      const at = Number(el.dataset.at);
      if (at > from && at <= step) el.animate([{ opacity: 0.4, transform: "scale(0.92)" }, { opacity: 1, transform: "scale(1)" }], { duration: 260, delay: dur * timeAt((at - from) / (step - from)), easing: EASE_OUT, fill: "backwards" });
    });
    requestAnimationFrame(() => centre(step, true)); // the view follows the bee
  }, [ready, step, owner, j, total, here.len]);

  // The note that opens over a tile or station: pointing at it (mouse) or tapping it (touch) says what happens there.
  // A note can carry a link (the stamp's proof) and a picture (the rank's card): then it stays open while the pointer travels from the tile onto it.
  const [tip, setTip] = useState<{ x: number; y: number; title: string; body: string; href?: string; img?: string } | null>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const tipClose = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tipFor = (x: number, y: number, size: number, title: string, body: string, more: { href?: string; img?: string } = {}) => {
    const show = () => { clearTimeout(tipClose.current); setTip({ x, y: y - size / 2, title, body, ...more }); setTipOpen(true); };
    return {
      onPointerEnter: (e: React.PointerEvent) => { if (e.pointerType === "mouse") show(); },
      onPointerLeave: (e: React.PointerEvent) => { if (e.pointerType === "mouse") { clearTimeout(tipClose.current); tipClose.current = setTimeout(() => setTipOpen(false), more.href ? 280 : 0); } },
      onClick: () => { if (tipOpen && tip?.x === x && tip.y === y - size / 2) setTipOpen(false); else show(); },
    };
  };
  // The stamp that filled point n, in words: "12 Nov 2026 · verified order, +5 points (points 6 to 10). 230 g of plastic avoided."
  const stampAt = (n: number) => steps.find((st) => st.from <= n && n <= st.to);
  const told = (st: PassportStep) => {
    const what = st.source === "order" ? "verified order" : st.source === "receipt" ? "verified receipt" : st.source === "card" ? "parcel card" : "visit";
    return `${new Date(st.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · ${what}, +${st.points} point${st.points === 1 ? "" : "s"}${st.points > 1 ? ` (points ${st.from} to ${st.to})` : ""}.${st.impactNote ? ` ${st.impactNote}` : ""}`;
  };
  /** For a station or board spot that is reached: which stamp brought the bee there. */
  const via = (n: number) => { const st = stampAt(n); return st ? { text: ` Reached with your stamp from ${st.merchant}, ${new Date(st.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}.`, href: `/p/${st.id}` } : { text: "", href: undefined }; };
  const away = (n: number) => `${n - step} more point${n - step === 1 ? "" : "s"} from where you are.`;
  const nextGoal = [...j.stations.map((r) => ({ x: r.x, y: r.y, n: r.at, size: j.station })), ...[...j.draws, ...j.explorers].map((d) => ({ x: d.x, y: d.y, n: d.n, size: j.spot }))]
    .filter((g) => g.n > step).sort((a, b) => a.n - b.n)[0];

  const labelAnchor = (x: number) => (x < 56 ? { a: "start" as const, x: x - j.station / 2 } : x > j.width - 56 ? { a: "end" as const, x: x + j.station / 2 } : { a: "middle" as const, x });
  const numbered = j.tile >= 24; // a phone's stones are too small for a number: the note over a stone says which point it is
  const halo = { paintOrder: "stroke" as const, stroke: PAPER, strokeWidth: 3.5, strokeLinejoin: "round" as const }; // text stays readable on any ground
  const stationAt = new Set([...RANKS.map((r) => r.at), ...j.draws.map((d) => d.n), ...j.explorers.map((d) => d.n)]); // the points that are not plain tiles
  const summary = step === 0
    ? "At the start. Collect a stamp to take your first step."
    : toGo === 0 ? `At point ${step} of ${j.end}, in the ${area} area.` : `At point ${step} of ${j.end}, in the ${area} area. ${toGo} more point${toGo === 1 ? "" : "s"} to ${nextTier}.`;

  return (
    <section className="grain relative rounded-[24px] bg-paper p-4 text-cocoa lg:p-6" aria-labelledby="journey-title">
      <div className="stitched pointer-events-none absolute inset-0 rounded-[24px]" aria-hidden />
      <div className="relative">
        <h2 id="journey-title" className="text-[19px] leading-tight lg:text-[22px]">Your journey</h2>
        <p className="mt-0.5 text-[13.5px] font-semibold">
          {step === 0 ? "You are at the start. Collect a stamp to take your first step." : toGo === 0 ? <>You&apos;ve reached the summit: the <b>{area}</b> area, with <b>{points}</b> points.{step < j.end ? ` ${j.end - step} more point${j.end - step === 1 ? "" : "s"} to the last tile.` : ""}</> : <>You&apos;re in the <b>{area}</b> area, at point <b>{points}</b>. {toGo} more point{toGo === 1 ? "" : "s"} to {nextTier}.</>}
        </p>

        <h3 className="mb-2 mt-4 text-[13.5px] font-extrabold">Ways to take a step</h3>
        <div className="lg:hidden"><StepTiles onScan={owner ? onScan : undefined} onReceipt={owner ? onReceipt : undefined} /></div>
        <div className="hidden gap-2 lg:grid lg:grid-cols-4">
          {SIGNS.map((s) => <Signpost key={s.id} s={s} onScan={owner ? onScan : undefined} onReceipt={owner ? onReceipt : undefined} />)}
        </div>

        <div
          ref={scroller} tabIndex={desktop || expanded ? undefined : 0} aria-label={desktop || expanded ? undefined : "The trail, scrollable"}
          className={`mt-3 ${desktop || expanded ? "" : "max-h-[440px] overflow-y-auto overscroll-contain rounded-2xl"}`}
        >
          <div className="relative">
          <svg ref={svg} viewBox={`0 0 ${j.width} ${j.height}`} className="block h-auto w-full rounded-2xl" role="img" aria-label={`Journey map. ${summary}`}>
            <defs>
              <mask id="jm-land" maskUnits="userSpaceOnUse" x={0} y={0} width={j.width} height={j.height}><path d={j.road} fill="none" stroke="#fff" strokeWidth={j.land} strokeLinecap="round" strokeLinejoin="round" /></mask>
              <filter id="jm-soft" filterUnits="userSpaceOnUse" x={0} y={0} width={j.width} height={j.height}><feGaussianBlur stdDeviation={j.land * 0.07} /></filter>
            </defs>
            {/* The board: sea, then the land as a wide strip around the trail (surf, sand rim, ground), each rank's area in its own
                ground colour, softened where two meet. Nothing here takes a pointer: the tiles above do. */}
            <g pointerEvents="none">
              {painted ? <image href={painted} width={j.width} height={j.height} preserveAspectRatio="none" /> : <>
                <rect width={j.width} height={j.height} fill={SEA} />
                <path d={j.road} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={j.land + 20} strokeLinecap="round" strokeLinejoin="round" />
                <path d={j.road} fill="none" stroke={RIM} strokeWidth={j.land + 9} strokeLinecap="round" strokeLinejoin="round" />
                <g mask="url(#jm-land)">
                  <rect width={j.width} height={j.height} fill={GROUND.meadow} />
                  <g filter="url(#jm-soft)">{j.areas.map((a) => <path key={a.key} d={a.d} fill="none" stroke={GROUND[TERRAIN[a.key]]} strokeWidth={j.land * 1.02} strokeLinecap="round" strokeLinejoin="round" />)}</g>
                </g>
                {j.decor.map((d, i) => <Deco key={i} d={d} />)}
                {j.landmarks.map((l) => <image key={l.key} href={`${LANDMARKS}/${l.terrain}.webp`} x={l.x - l.size / 2} y={l.y - l.size / 2} width={l.size} height={l.size} />)}
              </>}
              <path d={j.road} fill="none" stroke="rgba(58,42,28,0.22)" strokeWidth={j.tile * 0.62 + 2.4} strokeLinecap="round" strokeLinejoin="round" />
              <path d={j.road} fill="none" stroke="#f7edd2" strokeWidth={j.tile * 0.62} strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <path ref={trail} d={j.road} fill="none" stroke={HONEY_DEEP} strokeWidth={Math.max(3, j.tile * 0.2)} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${here.len} ${total + 10}`} pointerEvents="none" />

            {/* Start */}
            <g transform={`translate(${j.nodes[0].x} ${j.nodes[0].y})`}>
              <rect x={-j.spot / 2} y={-j.spot / 2} width={j.spot} height={j.spot} rx={9} fill={PAPER} stroke={INK} strokeOpacity={0.6} strokeWidth={2} />
              <path d={`M${-j.spot * 0.22} ${j.spot * 0.3} V${-j.spot * 0.3} L${j.spot * 0.28} ${-j.spot * 0.12} L${-j.spot * 0.22} ${j.spot * 0.06}`} fill={HONEY} stroke={INK} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <text y={j.spot / 2 + 15} textAnchor="start" x={-j.spot / 2} fontSize={12} fontWeight={800} fill={INK} {...halo}>Start</text>
            </g>

            {/* One tile per point; the rank points are stations */}
            {j.nodes.filter((p) => p.n > 0 && !stationAt.has(p.n)).map((p) => {
              const done = p.n <= step;
              const st = done ? stampAt(p.n) : undefined;
              return (
                <g key={p.n} data-tile={p.n} className="jm-tile" {...(st ? tipFor(p.x, p.y, j.tile, st.merchant, told(st), { href: `/p/${st.id}` }) : tipFor(p.x, p.y, j.tile, `Point ${p.n}`, done ? "Stamped: you have passed this point." : away(p.n)))}>
                  <ellipse cx={p.x} cy={p.y + j.tile * 0.12} rx={j.tile / 2} ry={j.tile / 2} fill="rgba(58,42,28,0.25)" />
                  <circle cx={p.x} cy={p.y} r={j.tile / 2} strokeWidth={1.5} {...(done ? TILE_DONE : TILE_REST)} />
                  {done
                    ? <g data-stamp={p.n} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                        {/* the place's own badge on the points its stamp filled (Pola, 2026-11-20): the board shows where the points came from, and a shop sees itself on a shared passport. The badge is a rounded square and is never cropped round. */}
                        {st?.placeId
                          ? <image href={`/api/stamp-places/${st.placeId}/stamp`} x={p.x - j.tile * 0.56} y={p.y - j.tile * 0.56} width={j.tile * 1.12} height={j.tile * 1.12} />
                          : <Stamp x={p.x} y={p.y} size={j.tile} n={p.n} />}
                      </g>
                    : numbered && <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={800} fill={INK} fillOpacity={0.8} style={{ fontVariantNumeric: "tabular-nums" }}>{p.n}</text>}
                </g>
              );
            })}

            {/* The fixed spots where a random Season card is drawn (DRAW_AT). The app does not mint these yet, so reaching one only fills the tile in.
                The same size as a plain tile, with a gift where the number would be; the note that opens over it says what happens there. */}
            {j.draws.map((d) => {
              const done = d.n <= step;
              const s = j.spot;
              const card = season.find((c) => c.slot === `draw:${d.n}`); // the card that was drawn here, once the season runs
              const body = card ? `You drew ${card.name}${card.serial ? `, number ${card.serial} of ${card.cap}` : `, one of ${card.cap}`}. ${NFT_STATE_LABEL[nftState(card, wallet)]}.`
                : done ? `You reached ${d.n} points. Random NFTs start with Season 1.` : `Reach ${d.n} points and one random Season 1 NFT is drawn for you. ${away(d.n)} Starts with Season 1.`;
              return (
                <g key={`draw${d.n}`} data-tile={d.n} data-station={`draw-${d.n}`} data-at={d.n} className="jm-tile" role="img" aria-label={card ? `${card.name}, the Season 1 NFT drawn at ${d.n} points` : `Random Season 1 NFT at ${d.n} points`} {...tipFor(d.x, d.y, s, card ? card.name : "Random NFT", body)}>
                  <rect x={d.x - s / 2} y={d.y - s / 2} width={s} height={s} rx={9} fill={done ? "#f7d27a" : "#fdf1d6"} stroke={HONEY_DEEP} strokeOpacity={done ? 1 : 0.7} strokeWidth={2} strokeDasharray={done ? undefined : "4 3"} />
                  {card
                    ? <><image href={card.webpUrl} x={d.x - s / 2} y={d.y - s / 2} width={s} height={s} preserveAspectRatio="xMidYMid slice" clipPath="inset(0 round 9px)" /><rect x={d.x - s / 2} y={d.y - s / 2} width={s} height={s} rx={9} fill="none" stroke={HONEY_DEEP} strokeWidth={2.5} /></>
                    : <Gift x={d.x - s * 0.3} y={d.y - s * 0.3} width={s * 0.6} height={s * 0.6} color={done ? "#8f4c10" : HONEY_DEEP} strokeWidth={2.2} aria-hidden />}
                </g>
              );
            })}

            {/* The fixed spots where an Explorer card is given (EXPLORER_AT): the Explorer design of the rank area the spot lies in.
                A compass on a tile in the area's colour; the card's picture once it is the person's. */}
            {j.explorers.map((d) => {
              const done = d.n <= step;
              const s = j.spot;
              const design = seasonCardOf(d.rank, "explorer");
              const card = season.find((c) => c.slot === `explorer:${d.rank}`);
              const col = AREA_COLOUR[d.rank];
              const body = card ? `Your Explorer NFT${card.serial ? `, number ${card.serial} of ${card.cap}` : `, one of ${card.cap}`}. ${NFT_STATE_LABEL[nftState(card, wallet)]}.`
                : done ? `You reached ${d.n} points. This Explorer NFT comes with Season 1.` : `Reach ${d.n} points and the Explorer NFT ${design.name} is yours. ${away(d.n)} Starts with Season 1.`;
              return (
                <g key={`explorer${d.n}`} data-tile={d.n} data-station={`explorer-${d.n}`} data-at={d.n} className="jm-tile" role="img" aria-label={`${design.name}, the Explorer NFT at ${d.n} points`} {...tipFor(d.x, d.y, s, `Explorer NFT: ${design.name}`, body)}>
                  <rect x={d.x - s / 2} y={d.y - s / 2} width={s} height={s} rx={9} fill={PAPER} />
                  <rect x={d.x - s / 2} y={d.y - s / 2} width={s} height={s} rx={9} fill={col} fillOpacity={done ? 0.45 : 0.16} stroke={col} strokeOpacity={done ? 1 : 0.8} strokeWidth={2} strokeDasharray={done ? undefined : "4 3"} />
                  {card
                    ? <><image href={card.webpUrl} x={d.x - s / 2} y={d.y - s / 2} width={s} height={s} preserveAspectRatio="xMidYMid slice" clipPath="inset(0 round 9px)" /><rect x={d.x - s / 2} y={d.y - s / 2} width={s} height={s} rx={9} fill="none" stroke={col} strokeWidth={2.5} /></>
                    : <Compass x={d.x - s * 0.3} y={d.y - s * 0.3} width={s * 0.6} height={s * 0.6} color={INK} strokeWidth={2.2} aria-hidden />}
                </g>
              );
            })}

            {/* One station per rank */}
            {j.stations.map((r) => {
              const nft = stationFor(r);
              const state = nft ? nftState(nft, wallet) : null;
              const lab = labelAnchor(r.x);
              const img = (
                <>
                  {/* the NFT art is square, so its frame is too: the picture fills it and the rank-coloured line runs along its edge */}
                  <rect x={r.x - j.station / 2} y={r.y - j.station / 2} width={j.station} height={j.station} fill={PAPER} />
                  <image href={rankWebp(r.key)} x={r.x - j.station / 2} y={r.y - j.station / 2} width={j.station} height={j.station} preserveAspectRatio="xMidYMid slice" style={nft ? undefined : { filter: "grayscale(1)", opacity: 0.4 }} />
                  <rect x={r.x - j.station / 2} y={r.y - j.station / 2} width={j.station} height={j.station} fill="none" stroke={nft ? AREA_COLOUR[r.key] : INK} strokeOpacity={nft ? 1 : 0.35} strokeWidth={nft ? 3 : 2} strokeDasharray={nft ? undefined : "5 4"} />
                </>
              );
              const label = `${r.name} Bee Guardian, ${nft ? STATE_SHORT[state!].toLowerCase() : `unlocks at ${r.at} point${r.at === 1 ? "" : "s"}`}`;
              return (
                <g key={r.key} data-tile={r.at} data-station={r.key} data-at={r.at} className="jm-tile" {...tipFor(r.x, r.y, j.station, `${r.name} Bee Guardian`, nft ? `Your ${r.name} NFT: ${STATE_SHORT[state!].toLowerCase()}.${via(r.at).text}` : `Your ${r.name} NFT unlocks here, at ${r.at} point${r.at === 1 ? "" : "s"}. ${away(r.at)}`, nft ? { img: rankWebp(r.key), href: via(r.at).href } : {})}>
                  {nft
                    ? state === "onchain" && nft.assetId
                      ? <a href={explorerAsset(nft.assetId)} target="_blank" rel="noreferrer" aria-label={label}>{img}</a>
                      : <Link href="/collection" aria-label={label}>{img}</Link>
                    : <g role="img" aria-label={label}>{img}</g>}
                  <text x={lab.x} y={r.y + j.station / 2 + 15} textAnchor={lab.a} fontSize={12} fontWeight={800} fill={INK} {...halo}>{r.name} area</text>
                  <text x={lab.x} y={r.y + j.station / 2 + 29} textAnchor={lab.a} fontSize={12} fontWeight={600} fill={INK} {...halo}>{nft ? STATE_SHORT[state!] : `${r.at} point${r.at === 1 ? "" : "s"}`}</text>
                </g>
              );
            })}

            {/* the next goal breathes, so the eye finds where the trail leads */}
            {nextGoal && <rect className="jm-goal" x={nextGoal.x - nextGoal.size / 2 - 4} y={nextGoal.y - nextGoal.size / 2 - 4} width={nextGoal.size + 8} height={nextGoal.size + 8} rx={nextGoal.size === j.spot ? 12 : 4} fill="none" stroke={HONEY} strokeWidth={3} pointerEvents="none" />}

            {/* The bee stands on the point reached; it is moved by the arrival animation and rests at `here` */}
            <g ref={bee} style={{ transform: `translate(${here.x}px, ${here.y}px)` }} pointerEvents="none">
              <image className="jm-bee" href="/journey/pin/v1/bee.webp" x={-beeW / 2} y={j.tile * 0.2 - beeH} width={beeW} height={beeH} />
            </g>
          </svg>
          {/* the note over a tile; kept mounted so it can fade out, hidden from assistive tech (every tile has its own label) */}
          <div aria-hidden data-open={tipOpen} data-link={!!tip?.href} className="jm-tip" onPointerEnter={() => clearTimeout(tipClose.current)} onPointerLeave={(e) => { if (e.pointerType === "mouse") setTipOpen(false); }} style={tip ? { left: `${(tip.x / j.width) * 100}%`, top: `${(tip.y / j.height) * 100}%`, ["--jm-tx" as string]: tip.x < j.width * 0.25 ? "-18%" : tip.x > j.width * 0.75 ? "-82%" : "-50%" } : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a small card picture inside the note */}
            {tip?.img && <img src={tip.img} alt="" width={160} height={160} className="mb-1.5 block h-auto w-40 rounded-lg" />}
            <b className="block text-[13px] leading-tight">{tip?.title}</b>
            <span className="mt-0.5 block text-[12px] font-semibold leading-snug">{tip?.body}</span>
            {tip?.href && <Link href={tip.href} tabIndex={-1} className="mt-1.5 inline-block rounded-full bg-honey px-2.5 py-1 text-[12px] font-extrabold text-cocoa">See the proof on Solana</Link>}
          </div>
          </div>
        </div>

        {!desktop && (
          <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-2 text-[13.5px] font-extrabold underline decoration-sky decoration-[3px] underline-offset-4 hover:decoration-honey">
            {expanded ? "Fold the trail up" : "Show the whole trail"}
          </button>
        )}
        <p className="mt-2 text-[13px] font-semibold">The compass tiles give an Explorer NFT, at {EXPLORER_AT.slice(0, -1).join(", ")} and {EXPLORER_AT[EXPLORER_AT.length - 1]} points. The gift tiles draw a random NFT, at {DRAW_AT.slice(0, -1).join(", ")} and {DRAW_AT[DRAW_AT.length - 1]} points. Point at a tile, or tap it, to see what happens there.</p>
        <p className="mt-2 text-[13px] font-semibold">After the last tile, every {AFTER_SUMMIT_EVERY_SCAN}th stamp draws a random NFT. A passport holds a maximum of {MAX_NFTS} NFTs in Season 1.</p>
      </div>
    </section>
  );
}
