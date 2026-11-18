import Link from "next/link";
import QRCode from "qrcode";
import { BedDouble, Check, Coffee, Package, Store, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import { kindOf } from "@/lib/placeKinds";
import { POINTS_BY_KIND, pointsLabel } from "@/lib/stampClasses";

/** The hero's map (Pola, 2026-11-18): a flat street map in the look of an everyday maps app (drawn here as SVG, no real place and no
 *  map provider's tiles), with one pin per kind of eco place and one for online shops. A pin shows the kind's symbol and a small QR
 *  code side by side, the same size, because the QR code is what a customer finds there; the code is real and opens the map of
 *  places, it is not a place's claim code. The pins are decoration, not links; the whole picture links to /map. With `scanned` (the
 *  hero) it is three pictures in one (Pola, 2026-11-18): the map, the hotel's A6 postcard on its wooden stand at the lower left (a
 *  cut-out, art/hero-scan/cutout.py: what a customer finds at a place), and a phone at the lower right that has just scanned the
 *  Hotel pin's QR code (that code is framed and a dashed line runs from it to the phone) and shows the collected stamp. Server component:
 *  the QR is built once per render with the `qrcode` library. */
const ICON = { cafe: Coffee, restaurant: UtensilsCrossed, hotel: BedDouble, eco_shop: Store, online: Package } as const;
/** Online shops are not a place kind (an eco shop's channel), so the pin has its own ink colour. */
const ONLINE = "#3a2a1c";
type Pin = { kind: keyof typeof ICON; label: string; x: number; y: number };
/** The pin the phone has scanned. */
const SCANNED = "Hotel";

// Positions in percent of the map; the tip of a pin points at the spot.
const PINS: Pin[] = [
  { kind: "cafe", label: "Café", x: 20, y: 32 },
  { kind: "restaurant", label: "Restaurant", x: 46, y: 24 },
  { kind: "hotel", label: "Hotel", x: 78, y: 31 },
  { kind: "hotel", label: "Resort", x: 54, y: 54 },
  { kind: "online", label: "Online", x: 37, y: 72 },
  { kind: "eco_shop", label: "Eco shop", x: 50, y: 95 },
];

const W = 600, H = 460;
const C = { land: "#f2ede4", block: "#e9e2d5", house: "#ddd3c2", road: "#ffffff", edge: "#d8cfbf", main: "#fbe2a0", mainEdge: "#e9c770", park: "#cfe3b3", water: "#a8d2ec" };

/** A QR code as one SVG path (dark modules only). */
function qrPath(text: string): { d: string; n: number } {
  const m = QRCode.create(text, { errorCorrectionLevel: "M" }).modules;
  const n = m.size;
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m.get(y, x)) d += `M${x} ${y}h1v1h-1z`;
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

/** What the phone shows a few seconds after the scan: the stamp, its points and the proof. Points from lib/stampClasses.ts. */
function ScanPhone() {
  return (
    <div className="scan-phone absolute -bottom-[16%] -right-2 w-[212px] rounded-[34px] border-[8px] border-cocoa bg-paper p-3 pb-4 text-cocoa shadow-[0_26px_50px_rgba(58,42,28,0.45)] lg:-right-10" role="img" aria-label={`A phone that has scanned the hotel's QR code: stamp collected, ${pointsLabel(POINTS_BY_KIND.hotel)} for a hotel stay, proof written to Solana, Sentinel Bee Guardian NFT unlocked`}>
      <div className="mx-auto mb-2.5 h-[18px] w-[72px] rounded-full bg-cocoa" />
      <div className="rounded-2xl bg-kraft/60 px-3 py-2.5 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#8fa073] text-paper"><Check size={24} strokeWidth={3} aria-hidden /></span>
        <p className="font-journal-display mt-1.5 text-[18px] font-bold leading-tight">Stamp collected</p>
        <p className="mt-1.5 inline-block rounded-full bg-honey px-2.5 py-0.5 text-[11.5px] font-extrabold">+{pointsLabel(POINTS_BY_KIND.hotel)} · hotel stay</p>
      </div>
      <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-white/70 px-2.5 py-2 text-[11px] font-bold leading-snug"><Check size={14} strokeWidth={3} className="shrink-0 text-[#56633f]" aria-hidden /> Proof written to Solana. Nobody can fake it.</p>
      <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-white/70 px-2.5 py-2">
        <Image src="/landing/cards/sentinel.webp" alt="" width={600} height={840} sizes="40px" className="w-10 rounded-[5px] shadow-sm" />
        <p className="text-[11px] font-bold leading-snug">Bee Guardian NFT unlocked<span className="font-journal-display block text-[15px] leading-tight">Sentinel</span></p>
      </div>
    </div>
  );
}

export default function MapPicture({ scanned = false }: { scanned?: boolean }) {
  const qr = qrPath("https://ecoproof.app/map");
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <Link href="/map" aria-label="Open the map of eco places" className="sticker block overflow-hidden rounded-[18px]">
        <Streets />
      </Link>
      <ul aria-label="Kinds of eco places on the map, and online shops">
        {PINS.map((p) => {
          const I = ICON[p.kind], colour = p.kind === "online" ? ONLINE : kindOf(p.kind)?.colour;
          const box = "h-[30px] w-[30px] sm:h-[38px] sm:w-[38px]";
          const hit = scanned && p.label === SCANNED;
          return (
            <li key={p.label} className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-full flex-col items-center" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              <span className="mb-1 rounded-full bg-cocoa px-2 py-0.5 text-[11px] font-extrabold leading-tight text-paper shadow-sm">{p.label}</span>
              <span className="flex gap-[4px] rounded-[9px] bg-white p-[4px] shadow-[0_5px_12px_rgba(58,42,28,0.4)]">
                <span className={`flex items-center justify-center rounded-[6px] text-paper ${box}`} style={{ background: colour }}><I className="h-[60%] w-[60%]" strokeWidth={2.2} aria-hidden /></span>
                <span className={`relative block ${box}`}>
                  <svg viewBox={`0 0 ${qr.n} ${qr.n}`} className="block h-full w-full" shapeRendering="crispEdges" aria-hidden><path d={qr.d} fill={colour} /></svg>
                  {hit && <><span className="absolute -inset-[5px] rounded-[7px] border-[3px] border-honey" aria-hidden /><span className="absolute -inset-[5px] animate-ping rounded-[7px] border-[3px] border-honey motion-reduce:hidden" aria-hidden /></>}
                </span>
              </span>
              <span className="-mt-px h-0 w-0 border-x-[7px] border-t-[9px] border-x-transparent border-t-white drop-shadow-[0_3px_2px_rgba(58,42,28,0.3)]" aria-hidden />
            </li>
          );
        })}
      </ul>
      {scanned && <>
        {/* from the scanned code down to the phone */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          <path d="M83 33 C 86 36, 87 40, 86 46" fill="none" stroke="#e08a2e" strokeWidth={3} strokeDasharray="7 6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <Image src="/landing/hero/stand.webp" alt="The hotel's EcoProof postcard on a wooden stand: Collect an eco stamp for your stay, Rated by EcoProof, with a QR code" width={470} height={606} sizes="(min-width: 640px) 240px, 168px"
          className="hero-stand absolute -bottom-[16%] -left-3 -rotate-[3deg] drop-shadow-[0_18px_22px_rgba(58,42,28,0.4)] lg:-left-10" />
        <ScanPhone />
      </>}
    </div>
  );
}
