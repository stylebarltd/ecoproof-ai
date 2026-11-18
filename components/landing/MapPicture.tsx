import Image from "next/image";
import Link from "next/link";
import { BedDouble, Coffee, Package, Store, UtensilsCrossed } from "lucide-react";
import { kindOf } from "@/lib/placeKinds";

/** The landing's map picture: an illustrated town seen from above (art/v2/map, the hero island's checkpoint) with the pins drawn here, on top of the
 *  artwork, so they stay sharp and carry the app's own kind colours. A pin is a rounded-square tile like the place badge, never round.
 *  Online shops have no place on a map, so they are a parcel marker at its edge that links to the shop directory. Positions are in
 *  percent of the picture and belong to one artwork: a new map needs new positions. */
const ICON = { cafe: Coffee, restaurant: UtensilsCrossed, hotel: BedDouble, eco_shop: Store } as const;
type Pin = { kind: keyof typeof ICON; label: string; x: number; y: number };

export const MAP_SRC = "/landing/map/v1/map.webp";
// Positions on art/v2/map/map_62003.png: the tip of each pin sits on a roof.
const PINS: Pin[] = [
  { kind: "cafe", label: "Café", x: 29, y: 30 },
  { kind: "restaurant", label: "Restaurant", x: 50, y: 24 },
  { kind: "hotel", label: "Hotel", x: 62.5, y: 46 },
  { kind: "eco_shop", label: "Eco shop", x: 20, y: 69 },
  { kind: "hotel", label: "Resort", x: 67, y: 82 },
];

export default function MapPicture() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <Link href="/map" aria-label="Open the map of eco places" className="block">
        <Image src={MAP_SRC} alt="An illustrated map of a small town by the water with pins on a café, a restaurant, a hotel, a resort and an eco shop" width={1216} height={832} sizes="(min-width: 1024px) 520px, 100vw" className="sticker w-full -rotate-1" />
      </Link>
      {PINS.map((p) => {
        const I = ICON[p.kind];
        return (
          <span key={p.label} className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-full flex-col items-center" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] text-paper shadow-[0_4px_10px_rgba(58,42,28,0.45)] ring-2 ring-white" style={{ background: kindOf(p.kind)?.colour }}><I size={18} strokeWidth={2.4} aria-hidden /></span>
            <span className="mt-1 rounded-full bg-paper/95 px-2 py-0.5 text-[11px] font-extrabold leading-tight text-cocoa shadow-sm">{p.label}</span>
          </span>
        );
      })}
      <Link href="/shops" className="absolute -bottom-3 -right-2 inline-flex items-center gap-2 rounded-full bg-cocoa px-3.5 py-2 text-[13px] font-extrabold text-paper shadow-[0_6px_14px_rgba(58,42,28,0.4)] ring-2 ring-white hover:bg-honey-ink">
        <Package size={16} aria-hidden /> Online shops ship to you
      </Link>
    </div>
  );
}
