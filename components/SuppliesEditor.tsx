"use client";
import { useMemo } from "react";
import { supplyTopics, type SupplyTopic } from "@/lib/practices";
import type { Supply } from "@/lib/supplies";

/**
 * "Where to get it", the shop's side: tick the practices your products help a café, restaurant or hotel with, and name the product
 * (with a link if you have one). A topic with the same wording on several checklists is stored under each of its practice ids.
 */
export default function SuppliesEditor({ supplies, onChange, disabled }: { supplies: Supply[]; onChange: (s: Supply[]) => void; disabled: boolean }) {
  const topics = useMemo(() => supplyTopics(), []);
  const groups = useMemo(() => [...new Set(topics.map((t) => t.group))].map((g) => ({ label: g, topics: topics.filter((t) => t.group === g) })), [topics]);
  const of = (t: SupplyTopic) => supplies.find((s) => t.ids.includes(s.practiceId));
  const set = (t: SupplyTopic, v: { product: string; url: string | null } | null) =>
    onChange([...supplies.filter((s) => !t.ids.includes(s.practiceId)), ...(v ? t.ids.map((practiceId) => ({ practiceId, ...v })) : [])]);
  const field = "w-full rounded-xl bg-white/80 px-3 py-2 text-sm ring-1 ring-sage-900/15";
  const ticked = topics.filter((t) => of(t)).length;

  return (
    <section className="glass space-y-3 rounded-[28px] p-4 text-sm lg:p-5">
      <div>
        <h2 className="text-[17px]">Help cafés, restaurants and hotels</h2>
        <p className="mt-0.5 text-[12.5px] text-sage-900">
          Tick the practices your products help with. When a place answers No, EcoProof suggests the nearest shops that can help, under
          &ldquo;Where to get it&rdquo;. Suggestions are open to every shop and never change anyone&apos;s stars.{ticked ? ` You help with ${ticked}.` : ""}
        </p>
      </div>
      {groups.map((g) => {
        const n = g.topics.filter((t) => of(t)).length;
        return (
          <details key={g.label} className="rounded-2xl bg-white/60 p-3" open={n > 0}>
            <summary className="cursor-pointer text-[13px] font-bold">{g.label}{n ? <span className="ml-1.5 rounded-full bg-sage-500 px-2 py-0.5 text-[10.5px] text-cream">{n}</span> : null}</summary>
            <ul className="mt-2 divide-y divide-sage-900/10">
              {g.topics.map((t) => {
                const s = of(t);
                return (
                  <li key={t.key} className="py-2">
                    <label className="flex items-start gap-2.5">
                      <input type="checkbox" disabled={disabled} checked={!!s} onChange={(e) => set(t, e.target.checked ? { product: "", url: null } : null)} className="mt-0.5 h-4 w-4 shrink-0 accent-sage-600" />
                      <span className="text-[13px] leading-snug">{t.label}</span>
                    </label>
                    {s && (
                      <div className="mt-2 grid gap-2 pl-6 sm:grid-cols-2">
                        <input value={s.product} disabled={disabled} maxLength={60} onChange={(e) => set(t, { product: e.target.value, url: s.url })} placeholder="Product, e.g. Glass straws" className={field} aria-label={`Product for: ${t.label}`} />
                        <input value={s.url ?? ""} disabled={disabled} maxLength={300} inputMode="url" onChange={(e) => set(t, { product: s.product, url: e.target.value || null })} placeholder="Link (optional)" className={field} aria-label={`Link for: ${t.label}`} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </section>
  );
}
