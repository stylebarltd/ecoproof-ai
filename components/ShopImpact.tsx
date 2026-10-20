import { Leaf, Recycle } from "lucide-react";

export type ShopImpactData = { purchases: number; customers: number; plasticItems: number; co2Kg: number; packagingG: number };

const kg = (n: number) => (n >= 100 ? Math.round(n).toLocaleString("en") : n.toLocaleString("en", { maximumFractionDigits: 1 }));

/** What an eco shop's customers saved, in place of stars. `compact` is one line for lists and the map sheet. */
export default function ShopImpact({ impact, compact = false, className = "" }: { impact: ShopImpactData; compact?: boolean; className?: string }) {
  const none = impact.purchases === 0;
  if (compact) {
    return (
      <p className={`flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] text-sage-900 ${className}`}>
        {none ? <span>No verified purchases yet</span> : (
          <>
            <span className="flex items-center gap-1"><Recycle size={13} strokeWidth={2.5} /> <b className="text-ink">{impact.plasticItems.toLocaleString("en")}</b> plastic items saved</span>
            <span className="flex items-center gap-1"><Leaf size={13} strokeWidth={2.5} /> <b className="text-ink">{kg(impact.co2Kg)} kg</b> CO₂</span>
          </>
        )}
      </p>
    );
  }
  return (
    <div className={className}>
      {none ? (
        <p className="text-[13px] leading-snug">No verified purchases yet. Every online order that customers turn into a stamp adds what it saved here.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/70 p-3">
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-sage-900"><Recycle size={13} strokeWidth={2.6} /> Plastic saved</p>
              <p className="mt-0.5 font-heading text-[24px] leading-none">{impact.plasticItems.toLocaleString("en")}</p>
              <p className="text-[11.5px] text-sage-900">single-use items</p>
            </div>
            <div className="rounded-2xl bg-white/70 p-3">
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-sage-900"><Leaf size={13} strokeWidth={2.6} /> CO₂ saved</p>
              <p className="mt-0.5 font-heading text-[24px] leading-none">{kg(impact.co2Kg)}</p>
              <p className="text-[11.5px] text-sage-900">kg</p>
            </div>
          </div>
          <p className="mt-2 text-[11.5px] text-sage-900">From {impact.purchases} verified purchase{impact.purchases === 1 ? "" : "s"}. Estimates from what was bought, not audited figures.</p>
        </>
      )}
    </div>
  );
}
