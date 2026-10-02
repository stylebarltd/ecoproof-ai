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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [errLink, setErrLink] = useState("");
  const [done, setDone] = useState<Done | null>(null);

  const toggle = (id: PracticeId) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function submitReview() {
    if (!stars) return setErr("Pick a star rating.");
    setBusy(true); setErr(""); setErrLink("");
    try {
      // The proof reference (order-based) is attached here once the new proof system is wired in.
      const r = await fetch(`/api/places/${place.id}/reviews`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: getUserId(), stars, confirmed: picked.join(","), byoCup: byo }),
      });
      const j = await r.json();
      if (!r.ok) { setErrLink(j.claimUrl ?? ""); throw new Error(j.error || "Could not submit"); }
      setDone({ signature: j.signature, claimUrl: j.claimUrl, byoCup: j.byoCup, msg: "Review saved." });
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

  const open = (m: "review" | "pledge") => { setMode(m); setErr(""); setDone(null); setPicked([]); };
  const input = "w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-neutral-300";

  return (
    <div className="absolute inset-x-0 bottom-0 z-[1000] max-h-[80%] overflow-y-auto rounded-t-[28px] bg-neutral-100 p-4 text-ink shadow-[0_-8px_28px_rgba(46,43,37,0.22)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg">{place.name}</h2>
          <p className="text-xs text-neutral-600">
            {place.type}{place.demo ? " · demo shop" : ""} · {place.avgStars ? `★ ${place.avgStars} (${place.reviews} verified)` : "no verified reviews yet"}
          </p>
        </div>
        <button onClick={onClose} aria-label="Close" className="text-neutral-600">✕</button>
      </div>

      {place.ownerVerified && (
        <p className="mt-2 rounded-xl bg-sage-200 px-3 py-1.5 text-xs text-sage-900">✅ Plastic-free product shop · confirmed by its owner</p>
      )}

      {done ? (
        <div className="mt-3 space-y-2 rounded-2xl bg-sage-100 p-3 text-sm">
          <p className="font-semibold">✅ {done.msg}</p>
          {done.byoCup && <p>🔥 Bring-your-own-cup counted: +1 plastic avoided and your streak is updated.</p>}
          {done.signature && <a className="block underline" target="_blank" rel="noreferrer" href={txUrl(done.signature)}>⛓️ Review anchored on Solana ↗</a>}
          {done.claimUrl && <a className="block underline" target="_blank" rel="noreferrer" href={done.claimUrl}>🔒 Receipt claimed on Solana, can&apos;t be reused ↗</a>}
          <button onClick={() => { setMode("view"); setDone(null); }} className="mt-1 rounded-full bg-terra-500 px-4 py-1.5 font-semibold text-cream">Back to place</button>
        </div>
      ) : mode === "view" ? (
        <>
          <ul className="mt-3 space-y-2 text-sm">
            {place.practices.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-cream px-3 py-2">
                <span>{PRACTICES[p.id].icon} {PRACTICES[p.id].label}{p.id === "byo_discount" && p.detail ? <span className="text-neutral-600"> · {p.detail}</span> : null}</span>
                <span className="shrink-0 text-xs">
                  {p.verified ? <b className="text-sage-700">{p.ownerConfirmed && p.confirmations < p.needed ? "✅ Owner-verified" : "✅ Verified"}</b> : p.pledged ? <span className="text-terra-700">🤝 {p.confirmations}/{p.needed} confirmed</span> : <span className="text-neutral-500">not pledged</span>}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => open("review")} className="rounded-full bg-terra-500 px-2 py-3 text-sm font-bold text-cream">Review</button>
            <button onClick={() => open("pledge")} className="rounded-full border-[1.5px] border-neutral-300 px-2 py-3 text-sm font-semibold">I run this place</button>
          </div>
        </>
      ) : mode === "review" ? (
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-neutral-600">Only customers with a verified purchase from this place can review it. Your review is anchored on Solana.</p>
          <div className="flex gap-1 text-3xl" role="radiogroup" aria-label="Stars">
            {[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setStars(n)} aria-label={`${n} stars`} className={n <= stars ? "text-terra-500" : "text-neutral-300"}>★</button>)}
          </div>
          <p className="text-xs text-neutral-600">What did you see? Confirm only what you actually experienced:</p>
          {PRACTICE_IDS.map((id) => (
            <label key={id} className="flex items-center gap-2"><input type="checkbox" checked={picked.includes(id)} onChange={() => toggle(id)} /> {PRACTICES[id].icon} {PRACTICES[id].label}</label>
          ))}
          <label className="flex items-center gap-2 rounded-xl bg-cream p-2"><input type="checkbox" checked={byo} onChange={(e) => setByo(e.target.checked)} /> 🥤 I brought my own cup/container <span className="text-xs text-neutral-600">(counts for your streak)</span></label>
          <p className="rounded-xl bg-cream p-2 text-xs text-neutral-600">Review proofs are moving to verified purchases. Submitting is paused for now.</p>
          <div className="sticky bottom-0 -mx-4 -mb-4 space-y-2 bg-neutral-100 px-4 pb-4 pt-2">
          {err && (
            <div className="rounded-xl bg-terra-100 p-2.5 text-terra-800">
              <p>🔒 {err}</p>
              {errLink && <a className="underline" href={errLink} target="_blank" rel="noreferrer">See the on-chain claim ↗</a>}
            </div>
          )}
            <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode("view")} className="rounded-full border-[1.5px] border-neutral-300 py-2.5 font-semibold">Cancel</button>
            <button disabled onClick={submitReview} className="rounded-full bg-terra-500 py-2.5 font-bold text-cream disabled:opacity-60">Submit review</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-neutral-600">Pledge what you do. Customers confirm it with receipts, and you earn a verified badge once {place.practices[0].needed} do.</p>
          {PRACTICE_IDS.map((id) => (
            <label key={id} className="flex items-center gap-2"><input type="checkbox" checked={picked.includes(id)} onChange={() => toggle(id)} /> {PRACTICES[id].icon} {PRACTICES[id].label}</label>
          ))}
          {picked.includes("byo_discount") && <input className={input} placeholder="e.g. 10 baht off with your own cup" maxLength={80} value={discount} onChange={(e) => setDiscount(e.target.value)} />}
          <div className="sticky bottom-0 -mx-4 -mb-4 space-y-2 bg-neutral-100 px-4 pb-4 pt-2">
            {err && <p className="rounded-xl bg-terra-100 p-2.5 text-terra-800">{err}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setMode("view")} className="rounded-full border-[1.5px] border-neutral-300 py-2.5 font-semibold">Cancel</button>
              <button disabled={busy} onClick={submitPledge} className="rounded-full bg-terra-500 py-2.5 font-bold text-cream disabled:opacity-60">{busy ? "Saving…" : "Save pledge"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
