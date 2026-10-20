"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Globe, MapPin, Truck } from "lucide-react";
import ShopImpact from "@/components/ShopImpact";
import type { ShopListing } from "@/lib/shops";

type Here = { lat: number; lng: number };
/** Straight-line distance in km. */
function km(a: Here, b: Here) {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}
const fmtKm = (d: number) => (d < 1 ? `${Math.round(d * 1000)} m` : `${d < 10 ? d.toFixed(1) : Math.round(d).toLocaleString("en")} km`);
/** The nearest of a shop's shop locations and ships-from pin; Infinity when it has neither. */
const nearest = (s: ShopListing, here: Here) => Math.min(Infinity, ...s.points.map((p) => km(here, p)));
const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

/** Every eco shop, in store and online: the only place online-only shops can be found, since they have no map pin. */
export default function ShopsDirectory() {
  const [shops, setShops] = useState<ShopListing[] | null>(null);
  const [filter, setFilter] = useState<"all" | "store" | "online">("all");
  const [here, setHere] = useState<Here | null>(null);

  useEffect(() => { fetch("/api/shops").then((r) => (r.ok ? r.json() : [])).then(setShops).catch(() => setShops([])); }, []);
  const locate = () => navigator.geolocation?.getCurrentPosition((p) => setHere({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, { timeout: 15000 });
  useEffect(() => { // already allowed? sort by distance without asking
    navigator.permissions?.query({ name: "geolocation" }).then((st) => { if (st.state === "granted") locate(); }).catch(() => {});
  }, []);

  const shown = (shops ?? []).filter((s) => filter === "all" || (filter === "store" ? s.inStore : s.online));
  const listed = here ? [...shown].sort((a, b) => nearest(a, here) - nearest(b, here)) : shown;
  const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-[12px] font-semibold ${on ? "bg-sage-500 text-cream" : "border-[1.5px] border-neutral-300 text-ink"}`;

  return (
    <div className="space-y-4 lg:mx-auto lg:max-w-[880px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] leading-tight lg:text-[30px]">Eco shops</h1>
          <p className="text-[13px] text-sage-900">Shops near you and online, with what their customers saved. Shops don&apos;t get stars: their products do the saving.</p>
        </div>
        <Link href="/join" className="lift shrink-0 rounded-full bg-honey-500 px-3 py-1.5 text-[12px] font-bold text-ink">Run a shop?</Link>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button className={chip(filter === "all")} onClick={() => setFilter("all")}>All</button>
        <button className={chip(filter === "store")} onClick={() => setFilter("store")}>In store</button>
        <button className={chip(filter === "online")} onClick={() => setFilter("online")}>Online</button>
        {!here && <button onClick={locate} className="ml-auto flex items-center gap-1 text-[12px] font-bold text-sage-800 underline"><MapPin size={13} strokeWidth={2.5} /> Nearest first</button>}
      </div>

      {shops === null ? <p className="text-sm text-sage-900">Loading…</p> : !listed.length ? (
        <p className="glass rounded-[24px] p-4 text-sm">No {filter === "online" ? "online " : filter === "store" ? "in-store " : ""}eco shops yet. <Link href="/join" className="font-bold underline">Run one?</Link></p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {listed.map((s) => {
            const d = here ? nearest(s, here) : Infinity;
            return (
              <li key={s.id} className="glass flex flex-col gap-2.5 rounded-[24px] p-4">
                <Link href={`/places/${s.id}`} className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.imageUrl} alt="" width={52} height={52} className="h-[52px] w-[52px] shrink-0 rounded-full" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-heading text-[17px] leading-tight">{s.name}</span>
                    <span className="mt-0.5 flex flex-wrap gap-1.5">
                      {s.inStore && <span className="rounded-full bg-sage-200 px-2 py-0.5 text-[10.5px] font-bold text-sage-900">In store{s.locations > 1 ? ` · ${s.locations}` : ""}</span>}
                      {s.online && <span className="rounded-full bg-honey-300 px-2 py-0.5 text-[10.5px] font-bold text-ink">Online</span>}
                      {Number.isFinite(d) && <span className="text-[11px] text-sage-900">{fmtKm(d)} away</span>}
                    </span>
                    {s.tagline && <span className="mt-1 block text-[13px] leading-snug text-neutral-700">{s.tagline}</span>}
                  </span>
                  <ChevronRight size={18} strokeWidth={2.5} className="mt-1 shrink-0 text-sage-700" />
                </Link>
                {s.online && (s.shipsFrom || s.shipsTo || s.website) && (
                  <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-sage-900">
                    {(s.shipsFrom || s.shipsTo) && <span className="flex items-center gap-1"><Truck size={13} strokeWidth={2.5} /> {s.shipsFrom ? `Ships from ${s.shipsFrom}` : "Ships"}{s.shipsTo ? ` to ${s.shipsTo}` : ""}</span>}
                    {s.website && <a href={s.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-bold underline"><Globe size={13} strokeWidth={2.5} /> {host(s.website)}</a>}
                  </p>
                )}
                <ShopImpact impact={s.impact} compact />
              </li>
            );
          })}
        </ul>
      )}
      <p className="px-1 text-[11.5px] text-sage-900">Impact comes from verified purchases turned into stamps. The numbers are estimates from what was bought, not audited figures.</p>
    </div>
  );
}
