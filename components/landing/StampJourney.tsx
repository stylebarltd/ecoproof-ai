"use client";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import type { LandingRecord } from "@/lib/landingStats";

/** The phone is a fixed 504px screen, the height of its finished state (a longer order scrolls inside it); a phone cannot grow.
 *  What the customer sees on the phone in the seconds after scanning the QR on an order email, replayed on a loop: the same four steps
 *  the real claim screen shows (components/ClaimStamp.tsx), with the newest real record's own order and savings. Under
 *  prefers-reduced-motion the finished screen is shown still. */
export default function StampJourney({ r }: { r: LandingRecord | null }) {
  const items = r && r.items.length > 0 ? r.items.map((it) => `${it.quantity}× ${it.name}`).join(", ") : "your items";
  const saved = r ? `${r.plasticItems} plastic item${r.plasticItems === 1 ? "" : "s"} · ${r.co2Kg} kg CO₂e avoided` : "plastic and CO₂e avoided";
  const steps = [
    { label: "Reading your order", detail: items },
    { label: "Working out what it saved", detail: saved },
    { label: "Writing the proof to Solana", detail: "One line on a public ledger. The slow part, a few seconds.", hint: "Nobody can edit it later, not even us." },
    { label: "Stamp in your passport", detail: "+5 points · verified purchase" },
  ];
  // phase 0..3 = that step is running, 4 = all done (the stamp shows), then it starts over
  const [{ phase, still }, setState] = useState({ phase: 4, still: true });
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const wait = [900, 1300, 2600, 900, 3200];
    let p = 0;
    let t = 0;
    const tick = () => { setState({ phase: p, still: false }); t = window.setTimeout(() => { p = (p + 1) % 5; tick(); }, wait[p]); };
    t = window.setTimeout(tick, 400);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="relative mx-auto w-[236px] rounded-[34px] bg-[#1a1a1d] p-[9px] shadow-[0_18px_40px_rgba(58,42,28,0.28)]" aria-label="The phone screen while a stamp is collected">
      <div className="absolute left-1/2 top-[9px] h-[18px] w-[84px] -translate-x-1/2 rounded-b-[12px] bg-[#1a1a1d]" aria-hidden />
      <div className="flex h-[504px] flex-col overflow-y-auto rounded-[26px] bg-paper px-4 pb-5 pt-9">
        <p className="font-journal-display text-[18px] font-bold leading-none">Eco<span className="text-honey-deep">Proof</span></p>
        <p className="mt-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-cocoa/55">{r ? `Order · ${r.merchant}` : "Order · your shop"}</p>
        <ol className="mt-3 space-y-2.5" aria-live={still ? undefined : "polite"}>
          {steps.map((s, i) => {
            const state = i < phase ? "done" : i === phase ? "active" : "todo";
            return (
              <li key={s.label} className={`flex items-start gap-2.5 text-[13px] leading-snug transition-opacity duration-300 ${state === "todo" ? "opacity-35" : ""}`}>
                <span className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                  {state === "done" ? <Check size={17} strokeWidth={3} className="text-leaf" /> : state === "active" ? <Loader2 size={17} className="animate-spin text-honey-deep" /> : <span className="h-2.5 w-2.5 rounded-full bg-cocoa/30" />}
                </span>
                <span>
                  <span className={`font-bold ${state === "active" ? "text-cocoa" : "text-cocoa/90"}`}>{s.label}{state === "active" ? "…" : ""}</span>
                  {state !== "todo" && <span className="mt-0.5 block text-[12px] text-cocoa/65">{state === "active" && s.hint ? s.hint : s.detail}</span>}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="mt-auto flex h-[86px] shrink-0 items-center justify-center pt-5">
          {phase === 4 && (
            <div className={`stamp flex h-[82px] w-[82px] -rotate-6 flex-col items-center justify-center text-leaf ${still ? "" : "anim-pop"}`}>
              <Check size={26} strokeWidth={3.5} />
              <span className="mt-0.5 text-[11px]">verified</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
