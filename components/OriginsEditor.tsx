"use client";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { MapPin, Plus, Trash2, X } from "lucide-react";
import { COUNTRY_CODES, MAX_ORIGINS, countryName, type ShipOrigin } from "@/lib/shipping";

const PinPicker = dynamic(() => import("@/components/PinPicker"), { ssr: false, loading: () => <div className="h-56 w-full rounded-2xl bg-sage-200" /> });

/**
 * Where an online shop ships from: one card per warehouse, each with a name, who it ships to (countries, or everyone else) and a
 * pin for distances. One map is open at a time. Visitors see the origin that serves their country (lib/shipping.ts).
 */
export default function OriginsEditor({ origins, onChange, disabled }: { origins: ShipOrigin[]; onChange: (o: ShipOrigin[]) => void; disabled: boolean }) {
  const [open, setOpen] = useState<number | null>(origins.length && origins[0].lat == null ? 0 : null);
  const countries = useMemo(() => COUNTRY_CODES.map((c) => ({ c, name: countryName(c) })).sort((a, b) => a.name.localeCompare(b.name)), []);
  const set = (i: number, o: Partial<ShipOrigin>) => onChange(origins.map((x, j) => (j === i ? { ...x, ...o } : x)));
  const taken = (i: number) => new Set(origins.flatMap((o, j) => (j === i ? [] : o.countries)));
  const restTaken = (i: number) => origins.some((o, j) => j !== i && !o.countries.length);
  const field = "w-full rounded-xl bg-white/80 px-3 py-2 text-sm ring-1 ring-sage-900/15";

  function add() {
    onChange([...origins, { label: "", lat: null, lng: null, countries: [] }]);
    setOpen(origins.length);
  }

  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-[13px] font-bold">Where you ship from</p>
        <p className="text-[12px] text-sage-900">One for each warehouse. Visitors see the one that ships to their country, and its distance.</p>
      </div>
      {origins.map((o, i) => (
        <div key={i} className="space-y-2.5 rounded-2xl bg-white/70 p-3 ring-1 ring-sage-900/10">
          <div className="flex items-center gap-2">
            <input value={o.label} disabled={disabled} maxLength={80} onChange={(e) => set(i, { label: e.target.value })} placeholder={i ? "e.g. US warehouse" : "e.g. Chiang Mai, Thailand"} className={field} aria-label="Name of the place you ship from" />
            {!disabled && <button onClick={() => { onChange(origins.filter((_, j) => j !== i)); setOpen(null); }} aria-label="Remove" className="shrink-0 rounded-full p-2 text-sage-800 hover:bg-sage-200/60"><Trash2 size={16} strokeWidth={2.5} /></button>}
          </div>

          <div className="space-y-1.5 text-[12.5px]">
            <span className="font-bold">Ships to</span>
            <div className="flex flex-wrap gap-1.5">
              <button disabled={disabled || (restTaken(i) && !!o.countries.length)} onClick={() => set(i, { countries: [] })} className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold disabled:opacity-40 ${!o.countries.length ? "bg-sage-500 text-cream" : "ring-1 ring-sage-900/15"}`} title={restTaken(i) ? "Another place already ships to everyone else" : undefined}>
                {origins.length > 1 ? "Everyone else" : "Everywhere"}
              </button>
              {o.countries.map((c) => (
                <span key={c} className="flex items-center gap-1 rounded-full bg-sage-500 py-1 pr-1.5 pl-2.5 text-[11.5px] font-bold text-cream">
                  {countryName(c)}
                  {!disabled && <button onClick={() => set(i, { countries: o.countries.filter((x) => x !== c) })} aria-label={`Remove ${countryName(c)}`}><X size={12} strokeWidth={3} /></button>}
                </span>
              ))}
              {!disabled && (
                <select value="" onChange={(e) => e.target.value && set(i, { countries: [...o.countries, e.target.value] })} className="rounded-full bg-white px-2 py-1 text-[11.5px] font-bold ring-1 ring-sage-900/15" aria-label="Add a country">
                  <option value="">+ Country</option>
                  {countries.filter(({ c }) => !o.countries.includes(c) && !taken(i).has(c)).map(({ c, name }) => <option key={c} value={c}>{name}</option>)}
                </select>
              )}
            </div>
            {!o.countries.length && restTaken(i) && <p className="text-[12px] font-semibold text-terra-800">Pick the countries this warehouse ships to.</p>}
          </div>

          <div>
            <button onClick={() => setOpen(open === i ? null : i)} className="flex items-center gap-1.5 text-[12.5px] font-bold text-sage-800 underline">
              <MapPin size={14} strokeWidth={2.5} /> {o.lat != null ? (open === i ? "Hide the map" : "Pin set · change") : "Set it on the map"}
            </button>
            {open === i && <div className="mt-2"><PinPicker pin={o.lat != null && o.lng != null ? { lat: o.lat, lng: o.lng } : null} onPick={(p) => set(i, p)} disabled={disabled} /></div>}
          </div>
        </div>
      ))}
      {!disabled && origins.length < MAX_ORIGINS && (
        <button onClick={add} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[12.5px] font-bold ring-1 ring-sage-900/15"><Plus size={14} strokeWidth={2.6} /> {origins.length ? "Add another warehouse" : "Add where you ship from"}</button>
      )}
    </div>
  );
}
