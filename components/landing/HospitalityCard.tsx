"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, Star as StarIcon } from "lucide-react";
import type { Hospitality } from "@/lib/landingStats";
import { POINTS_BY_KIND, pointsLabel } from "@/lib/stampClasses";

/** The hospitality side of "your public page": a café or restaurant and a hotel with published stars (a real place once one has
 *  published; until then a demo place, shown as a dashed specimen with unfilled stars, never with the weight of real data, critique run 8).
 *  A switch picks which one, so a resort manager sees a hotel's page and what guests see of it before they book (critique run 8). */
const KIND_PAGE: Record<string, string> = { cafe: "a café's", restaurant: "a restaurant's", hotel: "a hotel's" };
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
const link = "font-extrabold underline decoration-sky decoration-[3px] underline-offset-4 hover:decoration-honey";

/** What a hotel gets before the guest arrives: only things the product does today (map star filter, the public page, the stay stamp). */
const BEFORE_BOOKING = [
  "Your stars on the eco map, where travellers can filter by stars.",
  "Your own page to link from your website or booking profile, with every practice behind the stars.",
  `A stay is a stamp worth ${pointsLabel(POINTS_BY_KIND.hotel)}, double a café visit, with your name in the guest's passport.`,
];

function Card({ h }: { h: Hospitality }) {
  const on = h.demo ? "fill-transparent text-honey-deep" : "fill-honey text-honey-deep";
  const half = h.demo ? "fill-transparent text-honey-deep" : "fill-honey/50 text-honey-deep";
  return (
    <div className={h.demo ? "rounded-[18px] border-2 border-dashed border-cocoa/25 p-5 sm:p-6" : "sticker grain rounded-[18px] bg-paper p-5 ring-1 ring-cocoa/10 sm:p-6"}>
      {h.demo
        ? <p className="text-[15px] font-extrabold">What {KIND_PAGE[h.kind] ?? "a place's"} page looks like <span className="font-bold text-cocoa/80">({h.name}, a demo place)</span></p>
        : <p className="font-stamp text-[15px] uppercase tracking-[0.14em] text-cocoa/80">{h.name} · published practices</p>}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex" role="img" aria-label={`${h.stars} out of 5 eco stars`}>
          {[1, 2, 3, 4, 5].map((k) => <StarIcon key={k} size={22} strokeWidth={2} aria-hidden className={k <= h.stars ? on : k - 0.5 <= h.stars ? half : "fill-transparent text-cocoa/25"} />)}
        </span>
        <span className="text-[15px] font-extrabold">{h.yes} of {h.total} practices, published {fmtDate(h.publishedAt)}</span>
      </div>
      {h.examples.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-[15px] leading-snug text-cocoa/85">
          {h.examples.map((t) => <li key={t} className="flex gap-2"><Check size={16} strokeWidth={3} className="mt-0.5 shrink-0 text-leaf-ink" aria-hidden /><span>{t}</span></li>)}
        </ul>
      )}
      {h.kind === "hotel" && (
        <div className="mt-4 border-t border-cocoa/10 pt-4">
          <p className="text-[15px] font-extrabold">What guests see before they book</p>
          <ul className="mt-2 space-y-1.5 text-[15px] leading-snug text-cocoa/85">
            {BEFORE_BOOKING.map((t) => <li key={t} className="flex gap-2"><span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-cocoa/50" /><span>{t}</span></li>)}
          </ul>
        </div>
      )}
      <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
        <Link href={`/places/${h.id}`} className={link}>See its page</Link>
        {h.kind === "hotel" && <Link href="/map" className={link}>The eco map</Link>}
        {h.txUrl && <a href={h.txUrl} target="_blank" rel="noopener" className={link}>Its declaration on Solana</a>}
      </p>
    </div>
  );
}

export default function HospitalityCard({ food, stay }: { food: Hospitality | null; stay: Hospitality | null }) {
  const [which, setWhich] = useState<"food" | "stay">(food ? "food" : "stay");
  const h = which === "stay" ? stay : food;
  if (!h) return null;
  return (
    <div>
      {food && stay && (
        <div role="group" aria-label="Show the page of" className="mb-3 inline-flex flex-wrap gap-1 rounded-full bg-kraft/40 p-1">
          {([["food", "Café / Restaurant"], ["stay", "Hotel / Resort"]] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={which === id} onClick={() => setWhich(id)} className={`h-11 rounded-full px-4 text-[15px] font-extrabold transition ${which === id ? "bg-cocoa text-paper" : "text-cocoa/80 hover:text-cocoa"}`}>{label}</button>
          ))}
        </div>
      )}
      <Card h={h} />
    </div>
  );
}
