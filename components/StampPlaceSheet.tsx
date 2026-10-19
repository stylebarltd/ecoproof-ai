"use client";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Stars from "@/components/Stars";
import { kindOf } from "@/lib/placeKinds";
import type { MapPlace } from "@/lib/stampPlaces";


export default function StampPlaceSheet({ place, onClose }: { place: MapPlace; onClose: () => void }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-[1100] max-h-[70%] overflow-y-auto rounded-t-[28px] bg-neutral-100 p-4 pb-6 shadow-[0_-8px_30px_rgba(0,0,0,0.15)] lg:inset-x-auto lg:top-4 lg:right-4 lg:bottom-auto lg:max-h-[calc(100%-2rem)] lg:w-[360px] lg:rounded-[28px] lg:bg-neutral-100/90 lg:p-5 lg:shadow-[0_12px_40px_rgba(39,46,27,0.25)] lg:backdrop-blur-xl">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={place.imageUrl} alt="" width={64} height={64} className="shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg">{place.name}</h2>
          <p className="text-xs text-neutral-600">{kindOf(place.kind)?.label ?? "Place"}{place.locationName && place.locationName !== place.name ? ` · ${place.locationName}` : ""}</p>
          {place.stars && <Stars stars={place.stars.stars} label={place.stars.label} size={15} showLabel className="mt-1" />}
          {place.tagline && <p className="mt-1 text-sm text-neutral-700">{place.tagline}</p>}
        </div>
        <button onClick={onClose} aria-label="Close" className="rounded-full text-neutral-600 transition hover:bg-white hover:text-ink lg:px-1.5">✕</button>
      </div>
      <p className="mt-3 rounded-xl bg-sage-200 px-3 py-1.5 text-xs text-sage-900">✅ EcoProof place · claimed and set up by its owner</p>
      <Link href={`/places/${place.id}`} className="mt-3 flex items-center justify-between rounded-2xl bg-white px-3.5 py-2.5 text-sm font-bold ring-1 ring-sage-900/10">
        {place.stars ? "See its eco practices" : "About this place"} <ChevronRight size={18} strokeWidth={2.5} className="text-sage-700" />
      </Link>
      <Link href={`/c/${place.id}`} className="lift mt-3 block rounded-full bg-terra-500 py-3 text-center font-bold text-cream">{place.demo ? "Collect a stamp (demo)" : "How to collect a stamp here"}</Link>
      <p className="mt-2 text-center text-[11px] text-neutral-500">Stamps are anchored on Solana. Some places check your location.</p>
      <p className="mt-1 text-center text-[11px]"><Link href={`/report/${place.id}`} className="text-neutral-500 underline">Not eco? Report this place</Link></p>
    </div>
  );
}
