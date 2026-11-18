import Link from "next/link";
import QRCode from "qrcode";
import { BedDouble, Coffee, Package, Store, UtensilsCrossed } from "lucide-react";
import { kindOf } from "@/lib/placeKinds";

/** The hero's map (Pola, 2026-11-18): a flat street map in the look of an everyday maps app (drawn here as SVG, no real place and no
 *  map provider's tiles), with one pin per kind of eco place. A pin is a small QR code with the kind's symbol in its middle, because
 *  the QR code is what a customer finds there; the code is real and opens the map of places, it is not a place's claim code. Online
 *  shops have no place on a map, so they are a parcel marker at its edge that links to the shop directory. The whole picture links to
 *  /map. Server component: the QR is built once per render with the `qrcode` library. */
const ICON = { cafe: Coffee, restaurant: UtensilsCrossed, hotel: BedDouble, eco_shop: Store } as const;
type Pin = { kind: keyof typeof ICON; label: string; x: number; y: number };

// Positions in percent of the map; the tip of a pin points at the spot.
const PINS: Pin[] = [
  { kind: "cafe", label: "Café", x: 24, y: 40 },
  { kind: "restaurant", label: "Restaurant", x: 52, y: 31 },
  { kind: "hotel", label: "Hotel", x: 79, y: 47 },
  { kind: "eco_shop", label: "Eco shop", x: 38, y: 78 },
  { kind: "hotel", label: "Resort", x: 68, y: 88 },
];

const W = 600, H = 460;
const C = { land: "#f2ede4", block: "#e9e2d5", house: "#ddd3c2", road: "#ffffff", edge: "#d8cfbf", main: "#fbe2a0", mainEdge: "#e9c770", park: "#cfe3b3", water: "#a8d2ec" };

/** A QR code as one SVG path (dark modules only), with the middle left empty for the symbol. Level H tolerates the hole. */
function qrPath(text: string): { d: string; n: number } {
  const m = QRCode.create(text, { errorCorrectionLevel: "H" }).modules;
  const n = m.size, hole = Math.round(n * 0.3), lo = (n - hole) / 2, hi = lo + hole;
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!m.get(y, x) || (x >= lo && x < hi && y >= lo && y < hi)) continue;
    d += `M${x} ${y}h1v1h-1z`;
  }
  return { d, n };
}

/** Small house footprints inside the street grid: the same every render (a fixed pseudo-random sequence), so the picture never jumps. */
function houses(): { x: number; y: number; w: number; h: number }[] {
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const out = [];
  for (let gx = -1; gx < 7; gx++) for (let gy = -1; gy < 6; gy++) {
    const bx = gx * 104 + 12, by = gy * 92 + 12;
    for (let i = 0; i < 4; i++) {
      if (rnd() < 0.3) continue;
      out.push({ x: bx + (i % 2) * 44 + rnd() * 6, y: by + Math.floor(i / 2) * 36 + rnd() * 5, w: 26 + rnd() * 12, h: 20 + rnd() * 10 });
    }
  }
  return out;
}

function Streets() {
  const rows = [-92, 0, 92, 184, 276, 368, 460], cols = [-104, 0, 104, 208, 312, 416, 520, 624];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden>
      <rect width={W} height={H} fill={C.land} />
      {/* the street grid sits a little askew, like a real town */}
      <g transform={`rotate(-11 ${W / 2} ${H / 2})`}>
        <rect x={-120} y={-120} width={W + 240} height={H + 240} fill={C.block} />
        <rect x={208} y={184} width={104} height={92} fill={C.park} />
        <rect x={-104} y={276} width={104} height={184} fill={C.park} />
        <rect x={416} y={-92} width={208} height={92} fill={C.park} />
        {houses().map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={2} fill={C.house} />)}
        {rows.map((y) => <line key={`re${y}`} x1={-200} x2={W + 200} y1={y} y2={y} stroke={C.edge} strokeWidth={13} />)}
        {cols.map((x) => <line key={`ce${x}`} y1={-200} y2={H + 200} x1={x} x2={x} stroke={C.edge} strokeWidth={13} />)}
        {rows.map((y) => <line key={`r${y}`} x1={-200} x2={W + 200} y1={y} y2={y} stroke={C.road} strokeWidth={10} />)}
        {cols.map((x) => <line key={`c${x}`} y1={-200} y2={H + 200} x1={x} x2={x} stroke={C.road} strokeWidth={10} />)}
      </g>
      {/* the river and the lake, over the grid, then the main road that crosses them */}
      <path d="M470 -20 C 440 90, 520 150, 470 250 S 380 380, 420 480" fill="none" stroke={C.water} strokeWidth={34} strokeLinecap="round" />
      <path d="M455 300 C 520 270, 640 300, 640 380 L 640 480 L 400 480 C 380 400, 400 330, 455 300 Z" fill={C.water} />
      <path d="M-20 250 C 120 215, 260 300, 380 240 S 560 130, 640 150" fill="none" stroke={C.mainEdge} strokeWidth={19} />
      <path d="M-20 250 C 120 215, 260 300, 380 240 S 560 130, 640 150" fill="none" stroke={C.main} strokeWidth={15} />
    </svg>
  );
}

export default function MapPicture() {
  const qr = qrPath("https://ecoproof.app/map");
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <Link href="/map" aria-label="Open the map of eco places" className="sticker block overflow-hidden rounded-[18px]">
        <Streets />
      </Link>
      <ul aria-label="Kinds of eco places on the map">
        {PINS.map((p) => {
          const I = ICON[p.kind], colour = kindOf(p.kind)?.colour;
          return (
            <li key={p.label} className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-full flex-col items-center" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              <span className="mb-1 rounded-full bg-cocoa px-2 py-0.5 text-[11px] font-extrabold leading-tight text-paper shadow-sm">{p.label}</span>
              <span className="relative block rounded-[9px] bg-white p-[4px] shadow-[0_5px_12px_rgba(58,42,28,0.4)]">
                <svg viewBox={`0 0 ${qr.n} ${qr.n}`} className="block h-[46px] w-[46px] sm:h-[54px] sm:w-[54px]" shapeRendering="crispEdges" aria-hidden><path d={qr.d} fill={colour} /></svg>
                <span className="absolute left-1/2 top-1/2 flex h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[5px] text-paper sm:h-[20px] sm:w-[20px]" style={{ background: colour }}><I size={12} strokeWidth={2.6} aria-hidden /></span>
              </span>
              <span className="-mt-px h-0 w-0 border-x-[7px] border-t-[9px] border-x-transparent border-t-white drop-shadow-[0_3px_2px_rgba(58,42,28,0.3)]" aria-hidden />
            </li>
          );
        })}
      </ul>
      <Link href="/shops" className="absolute -bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-cocoa px-3.5 py-2 text-[13px] font-extrabold text-paper shadow-[0_6px_14px_rgba(58,42,28,0.4)] ring-2 ring-white hover:bg-honey-ink">
        <Package size={16} aria-hidden /> Online shops ship to you
      </Link>
    </div>
  );
}
