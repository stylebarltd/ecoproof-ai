"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import StampPlaceSheet from "@/components/StampPlaceSheet";
import { PLACE_KINDS } from "@/lib/placeKinds";
import type { MapPlace } from "@/lib/stampPlaces";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="h-full w-full bg-sage-200" /> });

const KINDS = PLACE_KINDS.filter((k) => k.physical); // online shops have no pin
const key = (p: MapPlace) => `${p.id}:${p.locationId}`;

export default function MapPage() {
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [kind, setKind] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapPlace | null>(null);
  const deepLinked = useRef(false);

  useEffect(() => {
    const init = async () => {
      const r = await fetch("/api/places");
      if (r.ok) {
        const list: MapPlace[] = await r.json();
        setPlaces(list);
        if (!deepLinked.current) { // /map?place=<id> opens that place
          deepLinked.current = true;
          const hit = list.find((p) => p.id === new URLSearchParams(location.search).get("place"));
          if (hit) { setSel(key(hit)); setFocus(hit); }
        }
      }
      setLoaded(true);
    };
    init();
  }, []);

  const shown = places.filter((p) => !kind || p.kind === kind);
  const selected = places.find((p) => key(p) === sel) ?? null;
  const chip = (on: boolean) => `shrink-0 rounded-full px-[11px] py-1.5 text-[11px] font-semibold ${on ? "bg-sage-500 text-cream" : "border-[1.5px] border-neutral-300 text-ink"}`;
  const dot = (c: string) => <span className="inline-block h-[9px] w-[9px] rounded-full" style={{ background: c }} />;

  return (
    <div className="-mx-5 -mt-5 -mb-24 flex h-[calc(100dvh-3.75rem)] flex-col">
      <div className="space-y-2.5 px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] leading-tight">EcoProof places</h1>
            <p className="text-[13px] text-neutral-600">{loaded ? `${new Set(places.map((p) => p.id)).size} place${new Set(places.map((p) => p.id)).size === 1 ? "" : "s"} you can collect stamps at` : "Loading…"}</p>
          </div>
          <Link href="/join" className="shrink-0 rounded-full bg-honey-500 px-3 py-1.5 text-[12px] font-bold text-ink">Run a place?</Link>
        </div>
        <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5">
          <button className={chip(!kind)} onClick={() => setKind(null)}>All</button>
          {KINDS.map((k) => <button key={k.id} className={chip(kind === k.id)} onClick={() => setKind(kind === k.id ? null : k.id)}>{k.plural}</button>)}
        </div>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-neutral-700">
          {KINDS.map((k) => <span key={k.id} className="flex items-center gap-1.5">{dot(k.colour)} {k.label.toLowerCase()}</span>)}
        </div>
        <p className="text-[11px] leading-snug text-neutral-500">Verified = claimed and set up on EcoProof by its owner. Independent vetting is on our roadmap. <Link href="/rules" className="underline">Eco rules and reporting</Link></p>
      </div>
      <div className="relative min-h-0 flex-1">
        <MapView places={shown} selectedId={sel} onSelect={(k) => { setSel(k); setFocus(null); }} focus={focus} />
        {loaded && shown.length === 0 && (
          <div className="absolute inset-4 z-[1000] flex flex-col items-center justify-center gap-2 rounded-[28px] bg-neutral-100 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cream text-sage-600"><MapPin size={22} strokeWidth={2.5} /></span>
            <p className="font-heading text-[15px]">No places yet</p>
            <p className="max-w-[220px] text-[12.5px] text-neutral-600">Places appear here as they join EcoProof.</p>
          </div>
        )}
        {selected && <StampPlaceSheet key={sel} place={selected} onClose={() => setSel(null)} />}
      </div>
    </div>
  );
}
