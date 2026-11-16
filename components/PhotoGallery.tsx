"use client";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PlacePhoto } from "@/lib/photoRules";

/** A place's photos on its public page: a row to swipe on a phone, a grid on desktop. Tapping one opens it large. */
export default function PhotoGallery({ photos, name }: { photos: PlacePhoto[]; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [at, setAt] = useState(0);
  const alt = (i: number) => `${name}, photo ${i + 1} of ${photos.length}`;
  const step = (by: number) => setAt((i) => (i + by + photos.length) % photos.length);
  const round = "flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink";
  return (
    <>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0">
        {photos.map((p, i) => (
          <li key={p.id} className={`shrink-0 snap-center ${photos.length === 1 ? "w-full" : "w-[78%]"} lg:w-auto`}>
            <button type="button" onClick={() => { setAt(i); dialog.current?.showModal(); }} className="block w-full" aria-label={`Open ${alt(i)}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- served by our own route, already sized */}
              <img src={p.url} alt={alt(i)} loading={i ? "lazy" : "eager"} className="aspect-[4/3] w-full rounded-[22px] object-cover ring-1 ring-white/70" />
            </button>
          </li>
        ))}
      </ul>
      <dialog ref={dialog} onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
        onKeyDown={(e) => { if (e.key === "ArrowLeft") step(-1); if (e.key === "ArrowRight") step(1); }}
        className="m-auto max-h-[92dvh] max-w-[min(94vw,1100px)] overflow-visible bg-transparent p-0 backdrop:bg-ink/80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos[at].url} alt={alt(at)} className="max-h-[92dvh] max-w-full rounded-2xl object-contain" />
        <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className={`${round} absolute right-2 top-2`}><X size={20} strokeWidth={2.6} /></button>
        {photos.length > 1 && (
          <>
            <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className={`${round} absolute left-2 top-1/2 -translate-y-1/2`}><ChevronLeft size={22} strokeWidth={2.6} /></button>
            <button type="button" onClick={() => step(1)} aria-label="Next photo" className={`${round} absolute right-2 top-1/2 -translate-y-1/2`}><ChevronRight size={22} strokeWidth={2.6} /></button>
          </>
        )}
      </dialog>
    </>
  );
}
