"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, LocateFixed, MapPin, Star } from "lucide-react";
import StampPlaceSheet from "@/components/StampPlaceSheet";
import Stars from "@/components/Stars";
import { kindOf, PLACE_KINDS } from "@/lib/placeKinds";
import type { MapPlace } from "@/lib/stampPlaces";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="h-full w-full bg-sage-200" /> });

const KINDS = PLACE_KINDS; // online-only shops have no pin, so they never show up here
const key = (p: MapPlace) => `${p.id}:${p.locationId}`;

type Here = { lat: number; lng: number };
/** Straight-line distance in km. */
function km(a: Here, b: Here) {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}
const fmtKm = (d: number) => (d < 1 ? `${Math.round(d * 1000)} m` : `${d < 10 ? d.toFixed(1) : Math.round(d)} km`);

export default function MapPage() {
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [kind, setKind] = useState<string | null>(null);
  const [minStars, setMinStars] = useState(0); // 0 = any; above 0 hides places without stars (eco shops)
  const [focus, setFocus] = useState<MapPlace | null>(null);
  const deepLinked = useRef(false);
  const [here, setHere] = useState<Here | null>(null); // desktop list: distances, only once the browser shares a location

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

  const locate = () => navigator.geolocation?.getCurrentPosition((p) => setHere({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, { timeout: 15000 });
  useEffect(() => { // already allowed? show distances without asking
    navigator.permissions?.query({ name: "geolocation" }).then((st) => { if (st.state === "granted") locate(); }).catch(() => {});
  }, []);
  useEffect(() => { if (sel) document.getElementById(`place-${sel}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [sel]); // a marker click finds its row

  const shown = places.filter((p) => (!kind || p.kind === kind) && (!minStars || (p.stars?.stars ?? 0) >= minStars));
  const listed = here ? [...shown].sort((a, b) => km(here, a) - km(here, b)) : shown;
  const selected = places.find((p) => key(p) === sel) ?? null;
  const chip = (on: boolean) => `shrink-0 rounded-full px-[11px] py-1.5 text-[11px] font-semibold ${on ? "bg-sage-500 text-cream" : "border-[1.5px] border-neutral-300 text-ink"}`;
  const dot = (c: string) => <span className="inline-block h-[9px] w-[9px] rounded-full" style={{ background: c }} />;

  // Phones: header above a full-bleed map, place details as a bottom sheet. Desktop: list panel left, map right, details as a side panel.
  return (
    <div className="-mx-5 -mt-5 -mb-24 flex h-[calc(100dvh-3.75rem)] flex-col md:-mx-8 lg:mx-0 lg:mt-0 lg:-mb-16 lg:h-[calc(100dvh-8rem)] lg:min-h-[520px] lg:flex-row lg:gap-6">
      <div className="flex flex-col gap-2.5 px-5 pt-5 pb-3 md:px-8 lg-glass lg:w-[380px] lg:shrink-0 lg:rounded-[28px] lg:p-5 xl:w-[420px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] leading-tight lg:text-[26px]">EcoProof places</h1>
            <p className="text-[13px] text-neutral-600">{loaded ? `${new Set(places.map((p) => p.id)).size} place${new Set(places.map((p) => p.id)).size === 1 ? "" : "s"} you can collect stamps at` : "Loading…"}</p>
          </div>
          <Link href="/join" className="lift shrink-0 rounded-full bg-honey-500 px-3 py-1.5 text-[12px] font-bold text-ink">Run a place?</Link>
        </div>
        <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 md:-mx-8 md:px-8 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
          <button className={chip(!kind)} onClick={() => setKind(null)}>All</button>
          {KINDS.map((k) => <button key={k.id} className={chip(kind === k.id)} onClick={() => setKind(kind === k.id ? null : k.id)}>{k.plural}</button>)}
        </div>
        <div className="no-scrollbar -mx-5 flex items-center gap-1.5 overflow-x-auto px-5 md:-mx-8 md:px-8 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0" role="group" aria-label="Minimum eco stars">
          <span className="flex shrink-0 items-center gap-1 pr-0.5 text-[11px] font-bold text-sage-900"><Star size={12} strokeWidth={2.5} className="fill-honey-500 text-honey-500" /> Stars</span>
          {[0, 1, 2, 3, 4, 5].map((n) => <button key={n} className={chip(minStars === n)} onClick={() => setMinStars(n)} aria-pressed={minStars === n}>{n === 0 ? "Any" : n === 5 ? "5★" : `${n}★+`}</button>)}
        </div>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-neutral-700">
          {KINDS.map((k) => <span key={k.id} className="flex items-center gap-1.5">{dot(k.colour)} {k.label.toLowerCase()}</span>)}
          <span className="flex items-center gap-1.5"><span className="rounded-full bg-ink px-1 text-[10px] font-extrabold leading-4 text-honey-500">4★</span> eco stars</span>
        </div>
        <p className="text-[11px] leading-snug text-neutral-500 lg:text-sage-900">Verified = claimed and set up on EcoProof by its owner. Independent vetting is on our roadmap. <Link href="/rules" className="underline">Eco rules and reporting</Link></p>
        {/* Desktop place list: picking a row centres it on the map, picking a marker highlights its row */}
        <div className="hidden min-h-0 flex-1 flex-col lg:flex">
          <div className="mb-1.5 mt-1 flex items-center justify-between border-t border-white/60 pt-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sage-800">{shown.length} location{shown.length === 1 ? "" : "s"}</span>
            {!here && <button onClick={locate} className="flex items-center gap-1 rounded-full px-2 py-1 text-[11.5px] font-semibold text-sage-800 transition hover:bg-white/60"><LocateFixed size={13} strokeWidth={2.5} /> Show distances</button>}
          </div>
          <ul className="-mx-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2 py-1">
            {listed.map((p) => {
              const k = key(p), on = k === sel;
              return (
                <li key={k} id={`place-${k}`}>
                  <button onClick={() => { setSel(k); setFocus(p); }} aria-pressed={on} className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition ${on ? "bg-white/85 ring-2 ring-honey-400 shadow-[0_8px_24px_rgba(232,163,23,0.3)]" : "bg-white/40 ring-1 ring-white/70 hover:bg-white/70 hover:shadow-[0_6px_18px_rgba(39,46,27,0.12)]"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl} alt="" width={44} height={44} className="shrink-0 rounded-full" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5"><span className="truncate font-heading text-[15px] leading-tight">{p.name}</span>{p.demo ? <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold uppercase text-sage-800">demo</span> : <BadgeCheck size={15} strokeWidth={2.5} className="shrink-0 text-sage-700" aria-label="Verified" />}</span>
                      <span className="flex items-center gap-1.5 truncate text-[11.5px] text-sage-900">{dot(kindOf(p.kind)?.colour ?? "#e8a317")}{kindOf(p.kind)?.label ?? "Place"}{p.locationName && p.locationName !== p.name ? ` · ${p.locationName}` : ""}</span>
                      {p.stars && <Stars stars={p.stars.stars} label={p.stars.label} size={12} showLabel className="mt-0.5" />}
                    </span>
                    {here && <span className="shrink-0 text-[11.5px] font-bold text-sage-800">{fmtKm(km(here, p))}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 lg:overflow-hidden lg:rounded-[28px] lg:shadow-[0_8px_32px_rgba(39,46,27,0.14)] lg:ring-1 lg:ring-white/70">
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
