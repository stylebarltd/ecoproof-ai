"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import PlaceSheet from "@/components/PlaceSheet";
import { PRACTICES, PRACTICE_IDS, type PlaceSummary, type PracticeId } from "@/lib/practices";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="h-full w-full bg-emerald-900" /> });

export default function MapPage() {
  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [filter, setFilter] = useState<PracticeId | null>(null);
  const [onlyVerified, setOnlyVerified] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/places");
    if (r.ok) setPlaces(await r.json());
  }, []);
  useEffect(() => { const init = async () => { await load(); }; init(); }, [load]);

  const shown = places.filter((p) => {
    if (filter) { const s = p.practices.find((x) => x.id === filter)!; if (onlyVerified ? !s.verified : !s.pledged) return false; }
    else if (onlyVerified && !p.verifiedCount) return false;
    return true;
  });
  const selected = places.find((p) => p.id === sel) ?? null;
  const chip = (on: boolean) => `shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${on ? "bg-emerald-400 text-emerald-950" : "bg-emerald-900/90 text-emerald-100 ring-1 ring-emerald-700"}`;

  return (
    <div className="relative -mx-4 -my-6 h-[calc(100dvh-4.5rem)]">
      <MapView places={shown} selectedId={sel} onSelect={setSel} />
      <div className="absolute inset-x-0 top-0 z-[1000] space-y-2 bg-gradient-to-b from-emerald-950/90 to-transparent p-3 pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">🗺️ Plastic-free Chiang Mai</h1>
          <span className="text-[10px] text-emerald-300">{places.length} places</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button className={chip(onlyVerified)} onClick={() => setOnlyVerified((v) => !v)}>✅ Verified only</button>
          {PRACTICE_IDS.map((id) => <button key={id} className={chip(filter === id)} onClick={() => setFilter(filter === id ? null : id)}>{PRACTICES[id].icon} {PRACTICES[id].label.replace("Discount if you bring your own cup/container", "BYO discount")}</button>)}
        </div>
        <div className="flex gap-3 text-[10px] text-emerald-200">
          <span>🟢 verified</span><span>🟠 pledged</span><span>⚪ no pledge yet</span>
        </div>
      </div>
      {selected && <PlaceSheet key={selected.id} place={selected} onClose={() => setSel(null)} onChanged={load} />}
    </div>
  );
}
