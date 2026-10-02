"use client";
import { useState } from "react";
import Link from "next/link";

type Result = {
  id: string; merchant: string; hash: string; signature: string | null;
  items: { name: string; quantity: number; category: string }[];
  impact: { co2Kg: number; plasticItems: number; packagingG: number; sustainableItems: number };
};

export default function Home() {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState("");

  async function onFile(f: File) {
    setBusy(true); setErr(""); setRes(null);
    setStep("🤖 Reading receipt & calculating impact…");
    try {
      const fd = new FormData();
      fd.append("receipt", f);
      const r = await fetch("/api/receipts", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Upload failed");
      setRes(j);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    setBusy(false); setStep("");
  }

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold">🌱 EcoProof AI</h1>
        <p className="mt-1 text-emerald-300">Scan a receipt. Prove your impact.</p>
      </header>

      <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-500 bg-emerald-900/40 text-lg">
        <span className="text-4xl">📷</span>
        {busy ? step : "Tap to scan or upload receipt"}
        <input type="file" accept="image/*" capture="environment" className="hidden" disabled={busy}
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>

      {err && <p className="rounded-lg bg-red-900/50 p-3 text-red-200">{err}</p>}

      {res && (
        <section className="space-y-4 rounded-2xl bg-emerald-900/60 p-4">
          <h2 className="text-xl font-semibold">{res.merchant}</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat v={`${res.impact.co2Kg}kg`} l="CO₂ saved" />
            <Stat v={String(res.impact.plasticItems)} l="plastic avoided" />
            <Stat v={`${res.impact.packagingG}g`} l="packaging" />
          </div>
          <ul className="text-sm text-emerald-200">
            {res.items.map((i, k) => (
              <li key={k} className="flex justify-between border-b border-emerald-800 py-1">
                <span>{i.quantity}× {i.name}</span>
                <span className={i.category === "not_sustainable" ? "opacity-50" : "text-emerald-400"}>
                  {i.category === "not_sustainable" ? "—" : "✓ " + i.category.replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
          <p className="break-all text-xs text-emerald-400">
            ⛓️ {res.signature
              ? <a className="underline" href={`https://explorer.solana.com/tx/${res.signature}?cluster=devnet`} target="_blank">Verified on Solana</a>
              : "Anchoring pending"} · {res.hash.slice(0, 16)}…
          </p>
          <Link href={`/p/${res.id}`} className="block rounded-xl bg-emerald-500 py-3 text-center font-semibold text-emerald-950">
            View passport &amp; share card
          </Link>
        </section>
      )}
    </div>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return <div className="rounded-xl bg-emerald-800/60 p-2"><div className="text-xl font-bold">{v}</div><div className="text-xs text-emerald-300">{l}</div></div>;
}
