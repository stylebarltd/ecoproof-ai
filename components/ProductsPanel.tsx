"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, PackageCheck } from "lucide-react";
import { asksType, CATEGORY_LABELS, isCategory, PACKAGING_LABELS, PACKAGING_TYPES, PRODUCT_CATEGORIES, TYPE_LABELS, TYPES_BY_CATEGORY, type ProductSetupState } from "@/lib/productRules";
import { useProductSetup } from "./useProductSetup";

/**
 * The eco shop dashboard's products: the way into the product setup, and the "Confirm these products?" queue of receipt lines customers
 * scanned that match nothing on the shop's list yet. Confirming one adds it as a product; "Not plastic-free" takes it out of the queue.
 */
export default function ProductsPanel({ placeId }: { placeId: string }) {
  const s = useProductSetup(placeId);
  if (!s.d) return null;
  const { setup, products, queue } = s.d;
  const owner = s.d.role === "owner";
  const listed = products.filter((p) => p.status !== "removed").length;
  const open = [!setup.declaredAt && "declaration", listed === 0 && "products", setup.refill === null && "refill"].filter(Boolean);
  return (
    <section className="glass rounded-[28px] p-4 lg:p-5">
      <Link href={`/shop/${placeId}/products`} className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sage-500 text-cream"><PackageCheck size={22} strokeWidth={2.5} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-[17px] leading-tight">Plastic-free products</span>
          <span className="block text-[12px] text-sage-900">{listed ? `${listed} listed` : "None listed yet"}{open.length ? ` · still open: ${open.join(", ")}` : ""}</span>
        </span>
        <ChevronRight size={20} strokeWidth={2.5} className="shrink-0 text-sage-700" />
      </Link>
      {listed === 0 && <p className="mt-3 text-[12.5px] leading-snug text-sage-900">The more products you add, the more impact your customers collect and the more your store shows on the map.</p>}

      {queue.length > 0 && (
        <div className="mt-4 border-t border-sage-900/10 pt-3">
          <h3 className="text-[15px] font-bold leading-tight">Confirm these products?</h3>
          <p className="mt-0.5 text-[12.5px] leading-snug text-sage-900">Customers bought these items, and they aren&apos;t on your list yet. Until you decide, EcoProof AI estimates them. Confirm the ones you sell without plastic packaging and they join your list; set the pieces in the pack afterwards under &ldquo;Plastic-free products&rdquo;.</p>
          {owner && !setup.declaredAt && <p className="mt-2 rounded-xl bg-white/60 p-2.5 text-[12.5px]">To confirm products, <Link href={`/shop/${placeId}/products`} className="font-bold underline underline-offset-2">make your declaration first</Link>.</p>}
          <ul className="mt-2.5 space-y-2">
            {queue.map((q) => <QueueLine key={q.rawText} q={q} can={owner && !!setup.declaredAt} busy={s.busy} products={products.filter((p) => p.status !== "removed")}
              onConfirm={(b) => s.addProduct({ ...b, receiptName: q.rawText, fromQueue: true })} onSame={(id) => s.addAlias(id, q.rawText)} onDismiss={() => s.dismiss(q.rawText)} />)}
          </ul>
          {s.err && <p className="mt-2 rounded-xl bg-terra-100 p-2.5 text-sm text-terra-800" role="alert">{s.err}</p>}
        </div>
      )}
    </section>
  );
}

function QueueLine({ q, can, busy, products, onConfirm, onSame, onDismiss }: {
  q: ProductSetupState["queue"][number]; can: boolean; busy: boolean; products: ProductSetupState["products"];
  onConfirm: (b: { category: string; packagingType: string; productType?: string }) => Promise<boolean>; onSame: (productId: string) => Promise<boolean>; onDismiss: () => Promise<boolean>;
}) {
  const [same, setSame] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [packaging, setPackaging] = useState("");
  const pick = isCategory(category) && asksType(category); // elsewhere the kind follows from the category and the packaging
  const select = "min-w-0 flex-1 rounded-xl bg-white/80 px-2.5 py-2 text-[12.5px] ring-1 ring-sage-900/15";
  return (
    <li className="rounded-2xl bg-white/60 p-3">
      <div className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- a customer's photo of the product, when there is one */}
        {q.photoUrl && <img src={q.photoUrl} alt="Customer's photo" className="h-12 w-12 shrink-0 rounded-lg object-cover" />}
        <span className="min-w-0 flex-1">
          <span className="block break-words text-[13.5px] font-bold">{q.rawText}</span>
          <span className="block text-[11.5px] text-sage-900">Bought {q.times === 1 ? "once" : `${q.times} times`}</span>
        </span>
      </div>
      {can && (
        <>
          <div className="mt-2 flex flex-wrap gap-2">
            <select value={category} onChange={(e) => { setCategory(e.target.value); setType(""); }} aria-label="Category" className={select}>
              <option value="">Category…</option>
              {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c].label}</option>)}
            </select>
            {pick && isCategory(category) && (
              <select value={type} onChange={(e) => setType(e.target.value)} aria-label="What kind of product" className={select}>
                <option value="">What is it?…</option>
                {TYPES_BY_CATEGORY[category].map((t) => <option key={t} value={t}>{TYPE_LABELS[t].label}</option>)}
              </select>
            )}
            <select value={packaging} onChange={(e) => setPackaging(e.target.value)} aria-label="Packaging" className={select}>
              <option value="">Packaging…</option>
              {PACKAGING_TYPES.map((t) => <option key={t} value={t}>{PACKAGING_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={busy || !category || !packaging || (pick && !type)} onClick={() => onConfirm({ category, packagingType: packaging, productType: type || undefined })} className="inline-flex items-center gap-1.5 rounded-full bg-honey-500 px-3.5 py-2 text-xs font-bold text-ink disabled:opacity-50">
              {busy && <Loader2 size={14} className="animate-spin" />} Confirm as plastic-free
            </button>
            <button type="button" disabled={busy} onClick={onDismiss} className="glass rounded-full px-3.5 py-2 text-xs font-bold disabled:opacity-50">Not plastic-free</button>
          </div>
          {products.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-sage-900/10 pt-2">
              <select value={same} onChange={(e) => setSame(e.target.value)} aria-label="The same as a product on your list" className={select}>
                <option value="">Or: the same as a product on your list…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.receiptName}</option>)}
              </select>
              <button type="button" disabled={busy || !same} onClick={() => onSame(same)} className="glass rounded-full px-3.5 py-2 text-xs font-bold disabled:opacity-50">It&apos;s the same product</button>
            </div>
          )}
        </>
      )}
    </li>
  );
}
