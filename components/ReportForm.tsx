"use client";
import { useState } from "react";
import Link from "next/link";
import { getUserId } from "@/lib/clientUser";
import { CORE_RULES, REPORT_REASONS } from "@/lib/ecoRules";
import type { PublicPlace } from "@/lib/stampPlaces";

export default function ReportForm({ place }: { place: PublicPlace }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/places/${place.id}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, details, userId: getUserId() }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Could not send your report");
      setDone(true);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    setBusy(false);
  }

  if (done) return (
    <div className="space-y-3 pt-8 text-center">
      <h1 className="text-2xl">Thank you</h1>
      <p className="text-sm text-neutral-600">We&apos;ve received your report about {place.name}. A person will look at it. The place isn&apos;t told who reported it.</p>
      <Link href="/map" className="inline-block rounded-full bg-sage-500 px-4 py-2 font-bold text-cream">Back to the map</Link>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={place.imageUrl} alt="" width={56} height={56} />
        <div><h1 className="text-xl leading-tight">Report {place.name}</h1><p className="text-xs text-neutral-600">Places must keep our <Link href="/rules" className="underline">eco rules</Link>.</p></div>
      </div>
      <ul className="list-disc space-y-1 rounded-2xl bg-cream p-3 pl-7 text-xs text-neutral-700">{CORE_RULES.map((r) => <li key={r}>{r}</li>)}</ul>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">What did you see?</legend>
        {REPORT_REASONS.map((r) => (
          <label key={r.id} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ring-1 ${reason === r.id ? "bg-sage-200 ring-sage-500" : "bg-white ring-neutral-300"}`}>
            <input type="radio" name="reason" checked={reason === r.id} onChange={() => setReason(r.id)} /> {r.label}
          </label>
        ))}
      </fieldset>
      <label className="block text-sm font-semibold">Details (optional)
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={400} rows={3} placeholder="e.g. Iced coffee comes in a plastic cup with a plastic straw" className="mt-1 w-full rounded-xl bg-white p-2.5 text-sm font-normal ring-1 ring-neutral-300" />
      </label>
      {err && <p className="rounded-xl bg-terra-100 p-2.5 text-sm text-terra-800">{err}</p>}
      <button onClick={submit} disabled={busy || !reason} className="w-full rounded-full bg-terra-500 py-3 font-bold text-cream disabled:opacity-60">{busy ? "Sending…" : "Send report"}</button>
      <p className="text-[11px] text-neutral-500">Reports are reviewed by people. Please report only what you actually saw.</p>
    </div>
  );
}
