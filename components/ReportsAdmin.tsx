"use client";
import { useState } from "react";
import { REPORT_REASONS } from "@/lib/ecoRules";
import type { OpenProductReport, OpenReports } from "@/lib/moderation";
import { PRODUCT_REPORT_REASONS, REPORTS_TO_REMOVE } from "@/lib/productRules";

const label = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;

/** A product report's reason is stored as "reason" or "reason: details". */
function productReason(text: string) {
  const [id, ...rest] = text.split(": ");
  return { label: PRODUCT_REPORT_REASONS.find((r) => r.id === id)?.label ?? id, details: rest.join(": ") };
}

export default function ReportsAdmin({ token, initial, initialProducts }: { token: string; initial: OpenReports[]; initialProducts: OpenProductReport[] }) {
  const [items, setItems] = useState(initial);
  const [products, setProducts] = useState(initialProducts);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  async function act(placeId: string, action: "suspend" | "restore" | "review") {
    const note = action === "suspend" ? (prompt("Note shown to the owner (optional):") ?? "") : "";
    setBusy(placeId); setMsg("");
    const r = await fetch(`/api/admin/places/${placeId}/moderate`, { method: "POST", headers: { "content-type": "application/json", "x-admin-token": token }, body: JSON.stringify({ action, note }) });
    if (!r.ok) { setMsg((await r.json().catch(() => ({}))).error || "Failed"); setBusy(""); return; }
    const list = await fetch("/api/admin/reports", { headers: { "x-admin-token": token } });
    if (list.ok) setItems((await list.json()).places);
    setBusy("");
  }
  /** Our decision on one product report: confirmed (the second confirmed one removes the product) or not true. */
  async function decide(reportId: number, confirmed: boolean) {
    setBusy(`p${reportId}`); setMsg("");
    const r = await fetch(`/api/admin/product-reports/${reportId}`, { method: "POST", headers: { "content-type": "application/json", "x-admin-token": token }, body: JSON.stringify({ confirmed }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(j.error || "Failed"); else setProducts(j.products);
    setBusy("");
  }

  return (
    <div className="space-y-4 lg:mx-auto lg:max-w-[720px]">
      <h1 className="text-[22px]">Reports</h1>
      {msg && <p className="rounded-xl bg-terra-100 p-2 text-sm">{msg}</p>}
      {items.length === 0 && products.length === 0 && <p className="text-sm text-neutral-600">No open reports, nothing paused.</p>}
      {products.length > 0 && (
        <section className="space-y-2 rounded-[24px] bg-white p-4 ring-1 ring-neutral-300">
          <h2 className="text-lg leading-tight">Products reported as not true</h2>
          <p className="text-xs text-neutral-600">{REPORTS_TO_REMOVE} confirmed reports remove a product from its shop&apos;s eco list and from receipt matching.</p>
          <ul className="space-y-1.5">
            {products.map((r) => {
              const why = productReason(r.reason);
              return (
                <li key={r.id} className="rounded-xl bg-neutral-100 p-2 text-sm">
                  <b>{r.product}</b> at {r.place} <span className="text-[11px] text-neutral-500">· {r.confirmedSoFar} confirmed so far</span>
                  <p>{why.label}{why.details && <span className="text-neutral-700">: &ldquo;{why.details}&rdquo;</span>}</p>
                  <p className="text-[11px] text-neutral-500">{new Date(r.createdAt).toLocaleString()}</p>
                  <div className="mt-1.5 flex gap-2 text-xs font-bold">
                    <button disabled={busy === `p${r.id}`} onClick={() => decide(r.id, true)} className="rounded-full bg-terra-500 px-3 py-1.5 text-cream disabled:opacity-60">Confirm report</button>
                    <button disabled={busy === `p${r.id}`} onClick={() => decide(r.id, false)} className="rounded-full bg-sage-500 px-3 py-1.5 text-cream disabled:opacity-60">Not confirmed</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {items.map((p) => (
        <section key={p.placeId} className="space-y-2 rounded-[24px] bg-white p-4 ring-1 ring-neutral-300">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg leading-tight">{p.name}</h2>
              <p className="text-xs text-neutral-600">{p.kind} · {p.placeId}{p.owner ? ` · owner ${p.owner.slice(0, 4)}…${p.owner.slice(-4)}` : " · set up by us"}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${p.status === "active" ? "bg-sage-200" : p.status === "under_review" ? "bg-honey-300" : "bg-terra-200"}`}>{p.status.replace("_", " ")}</span>
          </div>
          <p className="text-xs text-neutral-600">{p.total} open report{p.total === 1 ? "" : "s"} · {p.verified} from customers with a stamp there{p.statusNote ? ` · ${p.statusNote}` : ""}</p>
          <ul className="space-y-1.5">
            {p.reports.map((r) => (
              <li key={r.id} className="rounded-xl bg-neutral-100 p-2 text-sm">
                <b>{label(r.reason)}</b>{r.verifiedVisitor && <em className="ml-1.5 rounded-full bg-sage-200 px-1.5 py-0.5 text-[10px] font-bold not-italic">visited</em>}
                {r.details && <p className="text-neutral-700">&ldquo;{r.details}&rdquo;</p>}
                <p className="text-[11px] text-neutral-500">{new Date(r.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-3 gap-2 text-xs font-bold">
            <button disabled={busy === p.placeId} onClick={() => act(p.placeId, "restore")} className="rounded-full bg-sage-500 py-2 text-cream disabled:opacity-60">Keep / restore</button>
            <button disabled={busy === p.placeId} onClick={() => act(p.placeId, "review")} className="rounded-full bg-honey-500 py-2 text-ink disabled:opacity-60">Pause</button>
            <button disabled={busy === p.placeId} onClick={() => act(p.placeId, "suspend")} className="rounded-full bg-terra-500 py-2 text-cream disabled:opacity-60">Remove</button>
          </div>
        </section>
      ))}
    </div>
  );
}
