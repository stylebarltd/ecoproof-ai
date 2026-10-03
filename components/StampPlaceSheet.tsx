"use client";
import Link from "next/link";
import { kindOf } from "@/lib/placeKinds";
import type { MapPlace } from "@/lib/stampPlaces";


export default function StampPlaceSheet({ place, onClose }: { place: MapPlace; onClose: () => void }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-[1100] max-h-[70%] overflow-y-auto rounded-t-[28px] bg-neutral-100 p-4 pb-6 shadow-[0_-8px_30px_rgba(0,0,0,0.15)]">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={place.imageUrl} alt="" width={64} height={64} className="shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg">{place.name}</h2>
          <p className="text-xs text-neutral-600">{kindOf(place.kind)?.label ?? "Place"}{place.locationName && place.locationName !== place.name ? ` · ${place.locationName}` : ""}</p>
          {place.tagline && <p className="mt-1 text-sm text-neutral-700">{place.tagline}</p>}
        </div>
        <button onClick={onClose} aria-label="Close" className="text-neutral-600">✕</button>
      </div>
      <p className="mt-3 rounded-xl bg-sage-200 px-3 py-1.5 text-xs text-sage-900">✅ EcoProof place · claimed and set up by its owner</p>
      <Link href={`/c/${place.id}`} className="mt-3 block rounded-full bg-terra-500 py-3 text-center font-bold text-cream">Collect a stamp here</Link>
      <p className="mt-2 text-center text-[11px] text-neutral-500">Stamps are anchored on Solana. Some places check your location.</p>
    </div>
  );
}
