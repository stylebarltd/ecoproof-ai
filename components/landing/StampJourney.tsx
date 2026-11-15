"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Check, Loader2, Pause, Play } from "lucide-react";
import type { LandingRecord } from "@/lib/landingStats";
import { GPS_RADIUS_M } from "@/lib/placeKinds";
import { POINTS_BY_KIND, POINTS_VERIFIED, pointsLabel } from "@/lib/stampClasses";
import { JournalWordmark } from "@/components/landing/shared";

/** The phone is a fixed 504px screen, the height of its finished state (a longer order scrolls inside it); a phone cannot grow.
 *  What the customer sees on the phone in the seconds after scanning a counter QR (`door="visit"`) or the QR on an order email, replayed on a loop: the same four steps
 *  the real claim screen shows (components/ClaimStamp.tsx), with the newest real record's own order and savings. Under
 *  prefers-reduced-motion the finished screen is shown still. The loop can be paused (it updates for longer than five seconds), and it is
 *  not a live region: a screen reader would otherwise announce it forever. */
const REDUCE = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => { const m = window.matchMedia(REDUCE); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };

/** Which claim the phone replays: a visit (QR on a café or hotel counter) or an online order (QR in the order email). */
export type Door = "visit" | "order";

const ANCHOR = { label: "Writing the proof to Solana", detail: "One line on a public ledger. The slow part, a few seconds.", hint: "Nobody can edit it later, not even us." };

export default function StampJourney({ r, door = "order" }: { r: LandingRecord | null; door?: Door }) {
  const items = r && r.items.length > 0 ? r.items.map((it) => `${it.quantity}× ${it.name}`).join(", ") : "your items";
  const saved = r ? `${r.plasticItems} plastic item${r.plasticItems === 1 ? "" : "s"} · ${r.co2Kg} kg CO₂e avoided` : "plastic and CO₂e avoided";
  // The visit steps follow the real claim screen for a place QR (components/ClaimStamp.tsx): location check, stamp check, Solana, passport.
  const steps: { label: string; detail: string; hint?: string }[] = door === "visit" ? [
    { label: "Checking you're at the café", detail: `Your phone's location, within ${GPS_RADIUS_M} m` },
    { label: "Checking your stamp", detail: "One per visit, once a day" },
    ANCHOR,
    { label: "Stamp in your passport", detail: `+${pointsLabel(POINTS_BY_KIND.cafe)} · café visit` },
  ] : [
    { label: "Reading your order", detail: items },
    { label: "Working out what it saved", detail: saved },
    ANCHOR,
    { label: "Stamp in your passport", detail: `+${pointsLabel(POINTS_VERIFIED)} · verified purchase` },
  ];
  // phase 0..3 = that step is running, 4 = all done (the stamp shows), then it starts over
  const [state, setState] = useState({ phase: 4, still: true });
  const [paused, setPaused] = useState(false);
  // false on the server and under reduced motion: the finished screen, still
  const motion = useSyncExternalStore(subscribe, () => !window.matchMedia(REDUCE).matches, () => false);
  const { phase, still } = motion && !paused ? state : { phase: 4, still: true };
  useEffect(() => {
    if (!motion || paused) return;
    const wait = [900, 1300, 2600, 900, 3200];
    let p = 0;
    let t = 0;
    const tick = () => { setState({ phase: p, still: false }); t = window.setTimeout(() => { p = (p + 1) % 5; tick(); }, wait[p]); };
    t = window.setTimeout(tick, 400);
    return () => window.clearTimeout(t);
  }, [motion, paused]);

  return (
    <div className="mx-auto w-[236px]">
    <div className="relative rounded-[34px] bg-[#1a1a1d] p-[9px] shadow-[0_18px_40px_rgba(58,42,28,0.28)]">
      <div className="absolute left-1/2 top-[9px] h-[18px] w-[84px] -translate-x-1/2 rounded-b-[12px] bg-[#1a1a1d]" aria-hidden />
      <div tabIndex={0} role="region" aria-label="The phone screen while a stamp is collected" className="flex h-[504px] flex-col overflow-y-auto rounded-[26px] bg-paper px-4 pb-5 pt-9">
        <p><JournalWordmark className="text-[18px]" /></p>
        <p className="mt-3 text-[12px] font-extrabold uppercase tracking-[0.14em] text-cocoa/80">{door === "visit" ? "Visit · your café" : r ? `Order · ${r.merchant}` : "Order · your shop"}</p>
        <ol className="mt-3 space-y-2.5">
          {steps.map((s, i) => {
            const state = i < phase ? "done" : i === phase ? "active" : "todo";
            return (
              <li key={s.label} className="flex items-start gap-2.5 text-[13px] leading-snug">
                <span className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                  {state === "done" ? <Check size={17} strokeWidth={3} className="text-leaf-ink" /> : state === "active" ? <Loader2 size={17} className="animate-spin text-honey-ink" /> : <span className="h-2.5 w-2.5 rounded-full bg-cocoa/30" />}
                </span>
                <span>
                  <span className={`font-bold ${state === "active" ? "text-cocoa" : state === "todo" ? "text-cocoa/80" : "text-cocoa/90"}`}>{s.label}{state === "active" ? "…" : ""}</span>
                  {state !== "todo" && <span className="mt-0.5 block text-[12px] text-cocoa/80">{state === "active" && s.hint ? s.hint : s.detail}</span>}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="mt-auto flex h-[86px] shrink-0 items-center justify-center pt-5">
          {phase === 4 && (
            <div className={`stamp flex h-[82px] w-[82px] -rotate-6 flex-col items-center justify-center text-leaf-ink ${still ? "" : "anim-pop"}`}>
              <Check size={26} strokeWidth={3.5} />
              <span className="mt-0.5 text-[12px]">verified</span>
            </div>
          )}
        </div>
      </div>
    </div>
    {motion && (
      <button type="button" onClick={() => setPaused((v) => !v)} aria-pressed={paused} className="mx-auto mt-3 flex h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-bold text-cocoa/80 hover:bg-kraft/40 hover:text-cocoa">
        {paused ? <Play size={15} aria-hidden /> : <Pause size={15} aria-hidden />} {paused ? "Play the replay" : "Pause the replay"}
      </button>
    )}
    </div>
  );
}
