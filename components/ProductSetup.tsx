"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Camera, Check, ImagePlus, Loader2, Plus, X } from "lucide-react";
import {
  CATEGORY_LABELS, PACKAGING_LABELS, PACKAGING_TYPES, PRODUCT_CATEGORIES, PRODUCT_NAME_MAX,
  type PackagingType, type Product, type ProductCategory,
} from "@/lib/productRules";
import { useProductSetup } from "./useProductSetup";

const STEPS = ["Your shop", "Declaration", "Categories", "Products", "Refill"] as const;
/** Steps 3 to 5 can be skipped; the skip screen says what the shop gains by coming back. */
const SKIP_TEXT = "The more products you add, the more impact your customers collect and the more your store shows on the map.";

const pill = "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold disabled:opacity-50";
const primary = `${pill} bg-honey-500 text-ink`;
const quiet = `${pill} glass text-ink`;
const field = "w-full rounded-xl bg-white/80 px-3 py-2.5 text-sm ring-1 ring-sage-900/15";

/**
 * An eco shop's product onboarding (docs/eco-product-standard.md). Two steps are required: the shop's basics (they come from /join; the
 * sample receipt can wait) and the declaration. Categories, products and refill each have "Skip for now" and can be finished later from
 * the dashboard, where this same page opens.
 */
export default function ProductSetup({ id }: { id: string }) {
  const s = useProductSetup(id);
  const [step, setStep] = useState<number | null>(null); // null: start where the shop left off
  const [skipping, setSkipping] = useState(false);
  const [done, setDone] = useState(false);
  const [declare, setDeclare] = useState(false);

  const back = <Link href={`/shop/${id}`} className="inline-flex items-center gap-1 text-[13px] font-bold text-sage-900"><ArrowLeft size={15} strokeWidth={2.6} /> My shop</Link>;
  if (!s.d) {
    return (
      <div className="space-y-4 lg:mx-auto lg:max-w-[720px]">
        {back}
        {s.state === "loading" ? <Loader2 size={24} className="mx-auto animate-spin text-sage-700" /> : (
          <p className="glass rounded-[22px] p-4 text-sm">{s.state === "signin" ? "Sign in to set up your products." : "This isn't an eco shop you run. Check you're signed in with the right account."}</p>
        )}
      </div>
    );
  }
  const { setup, products } = s.d;
  const owner = s.d.role === "owner";
  const declared = !!setup.declaredAt;
  // The products step shows the ticked categories, and any other that already has a product (one confirmed from the dashboard's queue).
  const shown = PRODUCT_CATEGORIES.filter((c) => setup.categories.includes(c) || products.some((p) => p.category === c));
  const at = step ?? (declared ? 3 : 0);
  const go = (n: number) => { s.setErr(""); setSkipping(false); setStep(n); };
  const next = () => (at >= STEPS.length - 1 ? setDone(true) : go(at + 1));

  if (done) {
    return (
      <div className="space-y-4 lg:mx-auto lg:max-w-[720px]">
        <section className="glass rounded-[28px] p-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage-500 text-cream"><Check size={26} strokeWidth={3} /></span>
          <h1 className="mt-3 text-[22px] leading-tight">{products.length ? `${products.length} product${products.length === 1 ? "" : "s"} on your eco list` : "Your shop is set up"}</h1>
          <p className="mt-1.5 text-[13px] leading-snug text-sage-900">
            {products.length ? "A receipt or order line with one of these names counts for your customer." : SKIP_TEXT} You can add products and answer the open questions any time from your dashboard.
          </p>
          <Link href={`/shop/${id}`} className={`${primary} mt-4`}>Back to my shop <ArrowRight size={16} /></Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:mx-auto lg:max-w-[720px]">
      {back}
      <div>
        <h1 className="text-[22px] leading-tight">Your plastic-free products</h1>
        <p className="text-[13px] text-sage-900">Tell us what you sell without plastic, by the name your receipts print, so your customers&apos; receipts find it.</p>
      </div>
      <ol className="flex flex-wrap gap-1.5" aria-label="Steps">
        {STEPS.map((label, i) => {
          const open = i <= 1 || declared; // nothing past the declaration before it is made
          return (
            <li key={label}>
              <button type="button" disabled={!open} aria-current={i === at ? "step" : undefined} onClick={() => go(i)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-bold disabled:opacity-45 ${i === at ? "bg-sage-500 text-cream" : "glass text-sage-900"}`}>{i + 1}. {label}</button>
            </li>
          );
        })}
      </ol>

      <section className="glass rounded-[28px] p-4 lg:p-5">
        {!owner && <p className="mb-3 rounded-xl bg-white/60 p-2.5 text-[12.5px] text-sage-900">Only the owner can change this. You can look.</p>}

        {skipping ? (
          <>
            <h2 className="text-[17px] leading-tight">Skip {STEPS[at].toLowerCase()} for now?</h2>
            <p className="mt-2 text-[14px] leading-snug">{SKIP_TEXT}</p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-sage-900">You can finish this later from your dashboard.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setSkipping(false)} className={primary}>Do it now</button>
              <button type="button" onClick={next} className={quiet}>Skip for now</button>
            </div>
          </>
        ) : at === 0 ? (
          <>
            <h2 className="text-[17px] leading-tight">Your shop</h2>
            <p className="mt-1 text-[12.5px] leading-snug text-sage-900">Name, location and how you sell are already saved from when you joined. <Link href={`/shop/${id}/practices`} className="font-bold underline underline-offset-2">Change them in shop settings</Link>.</p>
            {setup.inStore ? (
              <div className="mt-4 rounded-2xl bg-white/60 p-3.5">
                <p className="text-[14px] font-bold">One photo of a receipt from your till</p>
                <p className="mt-1 text-[12.5px] leading-snug text-sage-900">It shows EcoProof AI how your receipts print your shop name and your products. Do it now and you have the exact receipt names in front of you for the product step, which is what makes your customers&apos; receipts match. Without it, your first customer&apos;s scan has to serve as the sample.</p>
                <label className={`${setup.hasSample ? quiet : primary} mt-3 cursor-pointer ${s.busy || !owner ? "pointer-events-none opacity-50" : ""}`}>
                  {s.busy ? <Loader2 size={16} className="animate-spin" /> : setup.hasSample ? <Check size={16} strokeWidth={3} /> : <Camera size={16} strokeWidth={2.5} />}
                  {setup.hasSample ? "Sample receipt saved. Replace it" : "Add a sample receipt"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; s.sample(f).finally(() => { e.target.value = ""; }); }} />
                </label>
              </div>
            ) : <p className="mt-3 rounded-2xl bg-white/60 p-3.5 text-[12.5px] leading-snug text-sage-900">You sell online only, so there is no till receipt: your products are matched by their names in your orders.</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => go(1)} className={setup.hasSample || !setup.inStore ? primary : quiet}>{setup.hasSample || !setup.inStore ? <>Continue <ArrowRight size={16} /></> : "Skip the receipt for now"}</button>
            </div>
          </>
        ) : at === 1 ? (
          <>
            <h2 className="text-[17px] leading-tight">Declaration</h2>
            {declared ? (
              <p className="mt-2 flex items-start gap-2 text-[14px] leading-snug"><Check size={18} strokeWidth={3} className="mt-0.5 shrink-0 text-sage-700" /> You declared on {setup.declaredAt!.slice(0, 10)} that the products you list are sold without plastic packaging.</p>
            ) : (
              <label className="mt-3 flex cursor-pointer items-start gap-3 text-[14px] leading-snug">
                <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-sage-700" checked={declare} disabled={!owner} onChange={(e) => setDeclare(e.target.checked)} />
                <span><b>The products listed are sold without plastic packaging.</b></span>
              </label>
            )}
            <p className="mt-2 text-[12.5px] leading-snug text-sage-900">Customers can report otherwise, and confirmed reports remove the product from the eco list.</p>
            <div className="mt-4">
              <button type="button" disabled={s.busy || (!declared && (!declare || !owner))} onClick={async () => { if (declared || await s.saveSetup({ declared: true })) go(2); }} className={primary}>
                {s.busy && <Loader2 size={16} className="animate-spin" />} Continue <ArrowRight size={16} />
              </button>
            </div>
          </>
        ) : at === 2 ? (
          <>
            <h2 className="text-[17px] leading-tight">What do you sell plastic-free?</h2>
            <p className="mt-1 text-[12.5px] leading-snug text-sage-900">Tick every category that fits. You add the products next.</p>
            <ul className="mt-3 space-y-2">
              {PRODUCT_CATEGORIES.map((c) => {
                const on = setup.categories.includes(c);
                return (
                  <li key={c}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white/60 p-3 text-[14px] leading-snug">
                      <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-sage-700" checked={on} disabled={s.busy || !owner}
                        onChange={() => s.saveSetup({ categories: on ? setup.categories.filter((x) => x !== c) : [...setup.categories, c] })} />
                      <span><b>{CATEGORY_LABELS[c].label}</b><span className="block text-[12.5px] text-sage-900">{CATEGORY_LABELS[c].examples}</span></span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <StepButtons ready={setup.categories.length > 0} onNext={next} onSkip={() => setSkipping(true)} />
          </>
        ) : at === 3 ? (
          <>
            <h2 className="text-[17px] leading-tight">Your products</h2>
            <p className="mt-1 text-[12.5px] leading-snug text-sage-900">Add your main products, each with its name <b>exactly as your receipt prints it</b>: that name is how a customer&apos;s receipt finds it. You don&apos;t enter any impact numbers; EcoProof AI works them out from the category and the packaging.</p>
            {shown.length === 0 && <p className="mt-3 rounded-2xl bg-white/60 p-3 text-[13px]">No category ticked yet. <button type="button" onClick={() => go(2)} className="font-bold underline underline-offset-2">Tick your categories first</button>.</p>}
            <div className="mt-3 space-y-4">
              {shown.map((c) => (
                <CategoryProducts key={c} category={c} products={products.filter((p) => p.category === c)} counted={s.d!.counted} owner={owner} busy={s.busy}
                  onAdd={(b) => s.addProduct({ ...b, category: c })} onRemove={s.removeProduct} onPhoto={s.productPhoto} />
              ))}
            </div>
            <StepButtons ready={products.length > 0} onNext={next} onSkip={() => setSkipping(true)} />
          </>
        ) : (
          <>
            <h2 className="text-[17px] leading-tight">Refill</h2>
            <p className="mt-1 text-[14px] leading-snug">May customers bring their own containers?</p>
            <p className="mt-1 text-[12.5px] leading-snug text-sage-900">It is shown on the map with your shop.</p>
            <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Customers may bring their own containers">
              {([true, false] as const).map((v) => (
                <button key={String(v)} type="button" role="radio" aria-checked={setup.refill === v} disabled={s.busy || !owner} onClick={() => s.saveSetup({ refill: v })}
                  className={`${pill} min-w-[84px] ${setup.refill === v ? "bg-sage-500 text-cream" : "glass text-ink"}`}>{v ? "Yes" : "No"}</button>
              ))}
            </div>
            <StepButtons ready={setup.refill !== null} onNext={next} onSkip={() => setSkipping(true)} last />
          </>
        )}
        {s.err && <p className="mt-3 rounded-xl bg-terra-100 p-2.5 text-sm text-terra-800" role="alert">{s.err}</p>}
      </section>
    </div>
  );
}

/** A skippable step's buttons: "Continue" once something is filled in, "Skip for now" until then. */
function StepButtons({ ready, onNext, onSkip, last = false }: { ready: boolean; onNext: () => void; onSkip: () => void; last?: boolean }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {ready
        ? <button type="button" onClick={onNext} className={primary}>{last ? "Finish" : "Continue"} <ArrowRight size={16} /></button>
        : <button type="button" onClick={onSkip} className={quiet}>Skip for now</button>}
    </div>
  );
}

/** One category's products and the form that adds one. */
function CategoryProducts({ category, products, counted, owner, busy, onAdd, onRemove, onPhoto }: {
  category: ProductCategory; products: Product[]; counted: string[]; owner: boolean; busy: boolean;
  onAdd: (b: { receiptName: string; packagingType: string; replaces?: string }) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>; onPhoto: (id: string, f?: File) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [packaging, setPackaging] = useState<PackagingType | "">("");
  const [replaces, setReplaces] = useState("");
  const add = async () => { if (await onAdd({ receiptName: name, packagingType: packaging, replaces })) { setName(""); setReplaces(""); } };
  return (
    <div className="rounded-2xl bg-white/60 p-3">
      <h3 className="text-[14px] font-bold leading-tight">{CATEGORY_LABELS[category].label}</h3>
      {products.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {products.map((p) => (
            <li key={p.id} className="flex items-center gap-2.5 rounded-xl bg-white/80 p-2">
              <label className={`relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-sage-200/70 text-sage-800 ${owner ? "" : "pointer-events-none"}`} title="Add a photo of the product">
                {/* eslint-disable-next-line @next/next/no-img-element -- served by our own route, already sized */}
                {p.photoUrl ? <img src={p.photoUrl} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={18} strokeWidth={2.4} />}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label={`Photo of ${p.receiptName}`} disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; onPhoto(p.id, f).finally(() => { e.target.value = ""; }); }} />
              </label>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold">{p.receiptName}</span>
                <span className="block text-[11.5px] leading-snug text-sage-900">
                  {PACKAGING_LABELS[p.packagingType]}{p.replaces ? ` · replaces ${p.replaces}` : ""}
                  {!counted.includes(`${p.category}/${p.packagingType}`) && " · no impact figure for this packaging yet, so it counts nothing"}
                  {p.status === "reported" && " · reported once"}{p.status === "removed" && " · removed after reports"}
                </span>
              </span>
              {owner && (p.status === "declared" || p.status === "confirmed") && (
                <button type="button" disabled={busy} onClick={() => onRemove(p.id)} aria-label={`Remove ${p.receiptName}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/10 disabled:opacity-50"><X size={15} strokeWidth={2.8} /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      {owner && (
        <div className="mt-2.5 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input value={name} maxLength={PRODUCT_NAME_MAX} onChange={(e) => setName(e.target.value)} placeholder="Name exactly as on your receipt" aria-label="Receipt name" className={field} />
          <select value={packaging} onChange={(e) => setPackaging(e.target.value as PackagingType | "")} aria-label="Packaging" className={field}>
            <option value="">Packaging…</option>
            {PACKAGING_TYPES.map((t) => <option key={t} value={t}>{PACKAGING_LABELS[t]}</option>)}
          </select>
          {category === "reusables" && <input value={replaces} maxLength={PRODUCT_NAME_MAX} onChange={(e) => setReplaces(e.target.value)} placeholder="Optional: the single-use item it replaces, e.g. cling film" aria-label="What it replaces" className={`${field} sm:col-span-2`} />}
          <button type="button" disabled={busy || name.trim().length < 2 || !packaging} onClick={add} className={`${primary} sm:col-span-2 sm:justify-self-start`}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={2.8} />} Add product
          </button>
        </div>
      )}
    </div>
  );
}
