"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Passport } from "@/lib/passport";

type Result = {
  id: string; merchant: string; hash: string; signature: string | null;
  items: { name: string; quantity: number; category: string }[];
  impact: { co2Kg: number; plasticItems: number; packagingG: number; sustainableItems: number };
};

function getUserId() {
  try {
    let id = localStorage.getItem("ecoproof-user");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("ecoproof-user", id); }
    return id;
  } catch { return "demo-user"; }
}

export default function Home() {
  const [userId, setUserId] = useState("");
  const [pass, setPass] = useState<Passport | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async (id: string) => {
    const r = await fetch(`/api/passport?userId=${encodeURIComponent(id)}`);
    if (r.ok) setPass(await r.json());
  }, []);

  useEffect(() => {
    const init = async () => {
      const id = getUserId();
      setUserId(id);
      await load(id);
    };
    init();
  }, [load]);

  async function onFile(f: File) {
    setBusy(true); setErr(""); setRes(null);
    try {
      const fd = new FormData();
      fd.append("receipt", f);
      fd.append("userId", userId);
      const r = await fetch("/api/receipts", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Upload failed");
      setRes(j);
      load(userId);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    setBusy(false);
  }

  const t = pass?.totals;
  return (
    <div className="space-y-6 pb-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🌱 EcoProof</h1>
        <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${pass?.streak ? "bg-orange-500 text-white" : "bg-emerald-800 text-emerald-300"}`}>
          🔥 {pass?.streak ?? 0}-day streak
        </div>
      </header>

      <section className="rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-5">
        <p className="text-sm text-emerald-200">Your verified impact</p>
        <p className="mt-1 text-4xl font-bold">{(t?.co2Kg ?? 0).toFixed(1)} <span className="text-lg font-medium">kg CO₂ saved</span></p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat v={String(t?.plasticItems ?? 0)} l="plastics avoided" />
          <Stat v={`${t?.packagingG ?? 0}g`} l="packaging cut" />
          <Stat v={String(t?.receipts ?? 0)} l="proofs" />
        </div>
        {pass && pass.longestStreak > 0 && <p className="mt-3 text-xs text-emerald-300">Best streak: {pass.longestStreak} day{pass.longestStreak > 1 ? "s" : ""}</p>}
      </section>

      <label className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed py-8 text-lg ${busy ? "border-emerald-700 opacity-70" : "border-emerald-500 bg-emerald-900/40"}`}>
        <span className="text-4xl">{busy ? "🤖" : "📷"}</span>
        {busy ? "Reading receipt & anchoring proof…" : "Scan a receipt"}
        <input type="file" accept="image/*" capture="environment" className="hidden" disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      </label>

      {err && <p className="rounded-lg bg-red-900/50 p-3 text-red-200">{err}</p>}

      {res && (
        <section className="space-y-3 rounded-2xl bg-emerald-900/60 p-4">
          <h2 className="font-semibold">{res.merchant}</h2>
          {res.impact.sustainableItems === 0 && <p className="text-sm text-amber-300">No sustainable items detected on this receipt.</p>}
          <ul className="text-sm text-emerald-200">
            {res.items.map((i, k) => (
              <li key={k} className="flex justify-between gap-3 border-b border-emerald-800 py-1">
                <span>{i.quantity}× {i.name}</span>
                <span className={i.category === "not_sustainable" ? "opacity-50" : "shrink-0 text-emerald-400"}>
                  {i.category === "not_sustainable" ? "—" : "✓ " + i.category.replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm">
            +{res.impact.co2Kg} kg CO₂ · +{res.impact.plasticItems} plastics · +{res.impact.packagingG} g packaging
          </p>
          <p className="break-all text-xs text-emerald-400">
            ⛓️ {res.signature
              ? <a className="underline" href={`https://explorer.solana.com/tx/${res.signature}?cluster=devnet`} target="_blank">Verified on Solana</a>
              : "Anchoring pending"} · {res.hash.slice(0, 16)}…
          </p>
          <Link href={`/p/${res.id}`} className="block rounded-xl bg-emerald-500 py-3 text-center font-semibold text-emerald-950">
            Open share card
          </Link>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold">Badges</h2>
        <div className="grid grid-cols-4 gap-2">
          {(pass?.badges ?? []).map((b) => (
            <div key={b.id} title={b.desc} className={`rounded-xl p-2 text-center ${b.earned ? "bg-emerald-500 text-emerald-950" : "bg-emerald-900/60 opacity-50"}`}>
              <div className="text-2xl">{b.earned ? b.icon : "🔒"}</div>
              <div className="text-[10px] font-medium leading-tight">{b.name}</div>
            </div>
          ))}
        </div>
      </section>

      {pass && pass.records.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Recent proofs</h2>
          <ul className="space-y-2">
            {pass.records.map((r) => (
              <li key={r.id}>
                <Link href={`/p/${r.id}`} className="flex items-center justify-between rounded-xl bg-emerald-900/60 p-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.merchant}</span>
                    <span className="text-xs text-emerald-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block">{r.co2Kg} kg</span>
                    <span className="text-xs text-emerald-400">{r.verified ? "⛓️ on-chain" : "pending"}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return <div className="rounded-xl bg-black/20 p-2"><div className="text-xl font-bold">{v}</div><div className="text-[11px] text-emerald-200">{l}</div></div>;
}
