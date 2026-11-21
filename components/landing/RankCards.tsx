"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { RANKS } from "@/lib/milestoneRules";
import { SEASON_CARDS } from "@/lib/seasonRules";

/** The five rank cards on the landing ("I'm eco, and I have proof."). Each card turns over to its back: the EcoProof stamp logo as the
 *  cover, and the rank's facts below it. It turns on hover (mouse and trackpad only) and on a tap or Enter (the button toggles), one card
 *  at a time. The motion is in app/globals.css (.flip): transform only, and a plain fade for people who ask for less motion.
 *  A phone has no hover, so nothing there says the cards turn (Pola, 2026-11-21): the first time the row scrolls into view, each card peeks at
 *  its back and settles, one after the other (.flip-hint, touch screens only, once), and a line under the row says it in words, which is also
 *  all that people who ask for less motion get. */
export default function RankCards() {
  const [open, setOpen] = useState<string | null>(null);
  const row = useRef<HTMLUListElement>(null);
  const [hint, setHint] = useState<"idle" | "on" | "off">("idle"); // off after the first tap: turning a card back must not replay the peek
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setHint((h) => (h === "idle" ? "on" : h)); io.disconnect(); } }, { threshold: 0.6 }); // once: a hint that repeats on every scroll-by nags
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <>
    <ul ref={row} data-hint={hint === "on"} className="flip-hint scroll-snap-x no-scrollbar -mx-5 mt-3 flex gap-4 overflow-x-auto px-5 pb-2 sm:-mx-10 sm:px-10 lg:mx-0 lg:mt-8 lg:grid lg:grid-cols-5 lg:gap-3 lg:overflow-visible lg:px-0" aria-label="The five Bee Guardian ranks">
      {RANKS.map((r, i) => {
        const season = SEASON_CARDS.filter((c) => c.rank === r.key).length;
        return (
          <li key={r.key} className="w-[150px] shrink-0 text-center lg:w-auto" style={{ transform: `rotate(${(i - 2) * 2.5}deg)` }}>
            <button type="button" aria-pressed={open === r.key} onClick={() => { setHint("off"); setOpen(open === r.key ? null : r.key); }} className="flip block w-full cursor-pointer rounded-[10px] text-cocoa">
              <span className="flip-inner relative block" style={{ animationDelay: `${150 + i * 80}ms` }}>
                <span className="flip-face block">
                  <Image src={`/landing/cards/v2/${r.key}.webp`} alt={`${r.name} Bee Guardian card`} width={600} height={840} sizes="150px" className="w-full rounded-[10px] shadow-[0_10px_24px_rgba(58,42,28,0.25)]" />
                </span>
                <span className="flip-face flip-back absolute inset-0 flex flex-col items-center justify-center rounded-[10px] bg-[#f4e9d8] p-2 shadow-[0_10px_24px_rgba(58,42,28,0.25)]">
                  <span className="pointer-events-none absolute inset-[5px] rounded-[6px] border border-cocoa/25" />
                  <Image src="/landing/ecoproof-stamp.svg" alt="" width={96} height={96} unoptimized className="w-[52%]" />
                  <span className="font-journal-display mt-2 block text-[15px] font-bold leading-tight">{r.name}</span>
                  <span className="mt-1 block text-[11px] font-bold leading-snug text-cocoa/80">Rank {r.tier} of {RANKS.length}</span>
                  <span className="block text-[11px] font-bold leading-snug text-cocoa/80">Earned at {r.at} point{r.at === 1 ? "" : "s"}</span>
                  <span className="block text-[11px] font-bold leading-snug text-cocoa/80">+ {season} Season 1 cards</span>
                </span>
              </span>
            </button>
            <span className="mt-3 block text-[14px] font-extrabold">{r.name}</span>
            <span className="block text-[12px] font-bold text-cocoa/80">{r.at} point{r.at === 1 ? "" : "s"}</span>
          </li>
        );
      })}
    </ul>
    <p className="mt-2 hidden text-center text-[13px] font-bold text-cocoa/80 [@media(hover:none)]:block">Tap a card to turn it over.</p>
    </>
  );
}
