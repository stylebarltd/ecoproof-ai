"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import PlaceSheet from "@/components/PlaceSheet";
import { PRACTICE_IDS, type PlaceSummary, type PracticeId } from "@/lib/practices";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="h-full w-full bg-sage-200" /> });

const ORDER: PracticeId[] = ["plastic_free_products", ...PRACTICE_IDS.filter((id) => id !== "plastic_free_products")];
const SHORT: Record<PracticeId, string> = {
  no_styrofoam: "No styrofoam",
  no_plastic_straws: "No straws",
  no_plastic_cups: "No plastic cups",
  plastic_free_products: "Plastic-free product shops",
  byo_discount: "BYO discount",
};

export default function MapPage() {
  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [filter, setFilter] = useState<PracticeId | null>(null);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [focus, setFocus] = useState<PlaceSummary | null>(null);
  const deepLinked = useRef(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/places");
    if (r.ok) {
      const list: PlaceSummary[] = await r.json();
      setPlaces(list);
      // Deep link: /map?place=<id> opens that place (shareable).
      if (!deepLinked.current) {
        deepLinked.current = true;
        const hit = list.find((p) => p.id === new URLSearchParams(location.search).get("place"));
        if (hit) { setSel(hit.id); setFocus(hit); }
      }
    }
    setLoaded(true);
  }, []);
  useEffect(() => { const init = async () => { await load(); }; init(); }, [load]);

  const shown = places.filter((p) => {
    if (filter) { const s = p.practices.find((x) => x.id === filter)!; if (onlyVerified ? !s.verified : !s.pledged) return false; }
    else if (onlyVerified && !p.verifiedCount && !p.ownerVerified) return false;
    return true;
  });
  const selected = places.find((p) => p.id === sel) ?? null;
  const chip = (on: boolean) => `shrink-0 rounded-full px-[11px] py-1.5 text-[11px] font-semibold ${on ? "bg-sage-500 text-cream" : "border-[1.5px] border-neutral-300 text-ink"}`;
  const dot = (c: string) => <span className="inline-block h-[9px] w-[9px] rounded-full" style={{ background: c }} />;

  return (
    <div className="-mx-5 -mt-5 -mb-24 flex h-[calc(100dvh-3.75rem)] flex-col">
      <div className="space-y-2.5 px-5 pt-5 pb-3">
        <div>
          <h1 className="text-[22px] leading-tight">Plastic-free Chiang Mai</h1>
          <p className="text-[13px] text-neutral-600">{places.length} places</p>
        </div>
        <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5">
          {ORDER.slice(0, 1).map((id) => <button key={id} className={chip(filter === id)} onClick={() => setFilter(filter === id ? null : id)}>{SHORT[id]}</button>)}
          <button className={chip(onlyVerified)} onClick={() => setOnlyVerified((v) => !v)}>Verified only</button>
          {ORDER.slice(1).map((id) => <button key={id} className={chip(filter === id)} onClick={() => setFilter(filter === id ? null : id)}>{SHORT[id]}</button>)}
        </div>
        <div className="flex gap-3.5 text-xs text-neutral-700">
          <span className="flex items-center gap-1.5">{dot("#8fa073")} verified</span>
          <span className="flex items-center gap-1.5">{dot("#d67f48")} pledged</span>
          <span className="flex items-center gap-1.5">{dot("#c0b6a5")} no pledge yet</span>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <MapView places={shown} selectedId={sel} onSelect={(id) => { setSel(id); setFocus(null); }} fit={filter === "plastic_free_products"} focus={focus} />
        {loaded && shown.length === 0 && (
          <div className="absolute inset-4 z-[1000] flex flex-col items-center justify-center gap-2 rounded-[28px] bg-neutral-100 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cream text-sage-600"><MapPin size={22} strokeWidth={2.5} /></span>
            <p className="font-heading text-[15px]">No places yet</p>
            <p className="max-w-[220px] text-[12.5px] text-neutral-600">Verified shops will appear here as they join the pledge.</p>
          </div>
        )}
        {selected && <PlaceSheet key={selected.id} place={selected} onClose={() => setSel(null)} onChanged={load} />}
      </div>
    </div>
  );
}
