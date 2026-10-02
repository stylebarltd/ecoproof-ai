"use client";
import { useState } from "react";
import { PRACTICES, PRACTICE_IDS, type PlaceSummary, type PracticeId } from "@/lib/practices";
import { getUserId } from "@/lib/clientUser";

const txUrl = (s: string) => `https://explorer.solana.com/tx/${s}?cluster=devnet`;

type Done = { signature: string | null; claimUrl?: string | null; byoCup: boolean; msg: string };

export default function PlaceSheet({ place, onClose, onChanged }: { place: PlaceSummary; onClose: () => void; onChanged: () => void }) {
  const [mode, setMode] = useState<"view" | "review" | "pledge">("view");
  const [stars, setStars] = useState(0);
  const [picked, setPicked] = useState<PracticeId[]>([]);
  const [discount, setDiscount] = useState("");
  const [byo, setByo] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [errLink, setErrLink] = useState("");
  const [done, setDone] = useState<Done | null>(null);

  const toggle = (id: PracticeId) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function submitReview() {
    if (!file) return setErr("Add a photo of your receipt from this place.");
    if (!stars) return setErr("Pick a star rating.");
    setBusy(true); setErr(""); setErrLink("");
    try {
      const fd = new FormData();
      fd.append("receipt", file);
      fd.append("userId", getUserId());
      fd.append("stars", String(stars));
      fd.append("confirmed", picked.join(","));
      fd.append("byoCup", String(byo));
      const r = await fetch(`/api/places/${place.id}/reviews`, { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) { setErrLink(j.claimUrl ?? ""); throw new Error(j.error || "Could not submit"); }
      setDone({ signature: j.signature, claimUrl: j.claimUrl, byoCup: j.byoCup, msg: "Review verified and saved." });
      onChanged();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    setBusy(false);
  }

  async function submitPledge() {
    if (!picked.length) return setErr("Pick at least one practice to pledge.");
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/places/${place.id}/pledge`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ practices: picked, discount }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not save pledge");
      setDone({ signature: null, byoCup: false, msg: "Pledge saved. Customers can now confirm it with receipts." });
      onChanged();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    setBusy(false);
  }

  // Demo shops only: generate a fresh receipt (new number) printed with this shop's name.
  async function useDemoReceipt() {
    const kind = place.name === "SuperBee Eco Shop" ? "superbee" : place.name === "Green Market" ? "greenmarket" : "cafe";
    const blob = await (await fetch(`/api/demo-receipt?kind=${kind}&name=${encodeURIComponent(place.name)}`, { cache: "no-store" })).blob();
    setFile(new File([blob], "demo-receipt.png", { type: "image/png" }));
  }
  const retrySame = () => { setDone(null); setMode("review"); submitReview(); };

  const open = (m: "review" | "pledge") => { setMode(m); setErr(""); setDone(null); setPicked([]); };
  const input = "w-full rounded-lg bg-emerald-950/70 px-3 py-2 text-sm ring-1 ring-emerald-700";

  return (
    <div className="absolute inset-x-0 bottom-0 z-[1000] max-h-[75%] overflow-y-auto rounded-t-3xl bg-emerald-900 p-4 text-emerald-50 shadow-2xl ring-1 ring-emerald-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold">{place.name}</h2>
          <p className="text-xs text-emerald-300">
            {place.type}{place.demo ? " · demo shop" : ""} · {place.avgStars ? `★ ${place.avgStars} (${place.reviews} verified)` : "no verified reviews yet"}
          </p>
        </div>
        <button onClick={onClose} aria-label="Close" className="text-emerald-300">✕</button>
      </div>

      {place.ownerVerified && (
        <p className="mt-2 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-200 ring-1 ring-emerald-500/50">✅ Verified shop · confirmed by its owner (SuperBee)</p>
      )}

      {done ? (
        <div className="mt-3 space-y-2 rounded-xl bg-emerald-800/60 p-3 text-sm">
          <p className="font-semibold">✅ {done.msg}</p>
          {done.byoCup && <p>🔥 Bring-your-own-cup counted: +1 plastic avoided and your streak is updated.</p>}
          {done.signature && <a className="block underline" target="_blank" rel="noreferrer" href={txUrl(done.signature)}>⛓️ Review anchored on Solana ↗</a>}
          {done.claimUrl && <a className="block underline" target="_blank" rel="noreferrer" href={done.claimUrl}>🔒 Receipt claimed on Solana, can&apos;t be reused ↗</a>}
          {place.demo && file && <button onClick={retrySame} className="block text-xs text-emerald-300 underline">🔁 Try submitting the same receipt again</button>}
          <button onClick={() => { setMode("view"); setDone(null); }} className="mt-1 rounded-lg bg-emerald-500 px-3 py-1.5 font-semibold text-emerald-950">Back to place</button>
        </div>
      ) : mode === "view" ? (
        <>
          <ul className="mt-3 space-y-2 text-sm">
            {place.practices.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-950/50 px-3 py-2">
                <span>{PRACTICES[p.id].icon} {PRACTICES[p.id].label}{p.id === "byo_discount" && p.detail ? <span className="text-emerald-300"> · {p.detail}</span> : null}</span>
                <span className="shrink-0 text-xs">
                  {p.verified ? <b className="text-emerald-300">✅ Verified</b> : p.pledged ? <span className="text-amber-300">🤝 {p.confirmations}/{p.needed} confirmed</span> : <span className="text-emerald-500">not pledged</span>}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => open("review")} className="rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-emerald-950">🧾 Review with receipt</button>
            <button onClick={() => open("pledge")} className="rounded-xl bg-emerald-800 py-3 text-sm font-medium">🏪 I run this place</button>
          </div>
        </>
      ) : mode === "review" ? (
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-emerald-300">Only customers with a receipt from this place can review it. Your review is anchored on Solana.</p>
          <div className="flex gap-1 text-3xl" role="radiogroup" aria-label="Stars">
            {[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setStars(n)} aria-label={`${n} stars`} className={n <= stars ? "text-amber-400" : "text-emerald-700"}>★</button>)}
          </div>
          <p className="text-xs text-emerald-300">What did you see? Confirm only what you actually experienced:</p>
          {PRACTICE_IDS.map((id) => (
            <label key={id} className="flex items-center gap-2"><input type="checkbox" checked={picked.includes(id)} onChange={() => toggle(id)} /> {PRACTICES[id].icon} {PRACTICES[id].label}</label>
          ))}
          <label className="flex items-center gap-2 rounded-lg bg-emerald-800/60 p-2"><input type="checkbox" checked={byo} onChange={(e) => setByo(e.target.checked)} /> 🥤 I brought my own cup/container <span className="text-xs text-emerald-300">(counts for your streak)</span></label>
          <label className="block rounded-xl border-2 border-dashed border-emerald-600 p-3 text-center">
            {file ? `📎 ${file.name}` : "📷 Add your receipt photo"}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          {place.demo && <button onClick={useDemoReceipt} className="w-full rounded-lg bg-emerald-800 py-2 text-xs">🧾 Use a fresh demo receipt from this shop</button>}
          {err && (
            <div className="rounded-lg bg-red-900/50 p-2 text-red-200">
              <p>🔒 {err}</p>
              {errLink && <a className="underline" href={errLink} target="_blank" rel="noreferrer">See the on-chain claim ↗</a>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode("view")} className="rounded-xl bg-emerald-800 py-2.5">Cancel</button>
            <button disabled={busy} onClick={submitReview} className="rounded-xl bg-emerald-500 py-2.5 font-semibold text-emerald-950 disabled:opacity-60">{busy ? "Verifying receipt…" : "Submit review"}</button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-emerald-300">Pledge what you do. Customers confirm it with receipts, and you earn a verified badge once {place.practices[0].needed} do.</p>
          {PRACTICE_IDS.map((id) => (
            <label key={id} className="flex items-center gap-2"><input type="checkbox" checked={picked.includes(id)} onChange={() => toggle(id)} /> {PRACTICES[id].icon} {PRACTICES[id].label}</label>
          ))}
          {picked.includes("byo_discount") && <input className={input} placeholder="e.g. 10 baht off with your own cup" maxLength={80} value={discount} onChange={(e) => setDiscount(e.target.value)} />}
          {err && <p className="rounded-lg bg-red-900/50 p-2 text-red-200">{err}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode("view")} className="rounded-xl bg-emerald-800 py-2.5">Cancel</button>
            <button disabled={busy} onClick={submitPledge} className="rounded-xl bg-emerald-500 py-2.5 font-semibold text-emerald-950 disabled:opacity-60">{busy ? "Saving…" : "Save pledge"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
