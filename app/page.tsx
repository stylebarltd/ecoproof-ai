"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import InstallPrompt from "@/components/InstallPrompt";
import { LogoLockup } from "@/components/Logo";
import type { Passport } from "@/lib/passport";

type Result = {
  id: string; merchant: string; hash: string; signature: string | null; claimAddress: string | null; claimUrl: string | null;
  items: { name: string; quantity: number; category: string }[];
  impact: { co2Kg: number; plasticItems: number; packagingG: number; sustainableItems: number };
};

const short = (sig: string) => `${sig.slice(0, 6)}…${sig.slice(-6)}`;
const txUrl = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
const STEPS = ["Reading receipt with Claude", "Calculating impact", "Anchoring proof on Solana"];

function SolanaMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs><linearGradient id="sol" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#9945FF" /><stop offset="1" stopColor="#14F195" /></linearGradient></defs>
      <g fill="url(#sol)">
        <polygon points="5,3.5 22,3.5 19,7.5 2,7.5" />
        <polygon points="2,10 19,10 22,14 5,14" />
        <polygon points="5,16.5 22,16.5 19,20.5 2,20.5" />
      </g>
    </svg>
  );
}

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
  const [step, setStep] = useState(0);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [errLink, setErrLink] = useState("");

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
    setBusy(true); setErr(""); setErrLink(""); setRes(null); setStep(0); setLastFile(f);
    const timers = [setTimeout(() => setStep(1), 3500), setTimeout(() => setStep(2), 6500)];
    try {
      const fd = new FormData();
      fd.append("receipt", f);
      fd.append("userId", userId);
      const r = await fetch("/api/receipts", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) { setErrLink(j.claimUrl ?? ""); throw new Error(j.error || "Upload failed"); }
      setRes(j);
      load(userId);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    timers.forEach(clearTimeout);
    setBusy(false);
  }

  // Each tap generates a brand-new demo receipt (new number), so it can be claimed once, like a real one.
  async function tryDemo(n: 1 | 2) {
    const q = n === 1 ? "kind=superbee&name=SuperBee%20Eco%20Shop" : "kind=greenmarket&name=Green%20Market";
    const blob = await (await fetch(`/api/demo-receipt?${q}`, { cache: "no-store" })).blob();
    onFile(new File([blob], `demo-${n}.png`, { type: "image/png" }));
  }

  const t = pass?.totals;
  return (
    <div className="space-y-6 pb-10">
      <header className="flex items-center justify-between">
        <div>
          <h1><LogoLockup size={38} /></h1>
          <a href={pass?.registryUrl ?? "https://solana.com"} target="_blank" rel="noreferrer"
             className="mt-1 inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-emerald-200 ring-1 ring-[#9945FF]/60">
            <SolanaMark className="h-3 w-3" /> Proofs on Solana <span className="opacity-60">· devnet</span>
          </a>
        </div>
        <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${pass?.streak ? "bg-orange-500 text-white" : "bg-emerald-800 text-emerald-300"}`}>
          🔥 {pass?.streak ?? 0}-day streak
        </div>
      </header>

      <InstallPrompt />

      <section className="rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-5">
        <p className="text-sm text-emerald-200">Your verified impact</p>
        <p className="mt-1 text-4xl font-bold">{(t?.co2Kg ?? 0).toFixed(1)} <span className="text-lg font-medium">kg CO₂ saved</span></p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat v={String(t?.plasticItems ?? 0)} l="plastics avoided" />
          <Stat v={`${t?.packagingG ?? 0}g`} l="packaging cut" />
          <Stat v={String(t?.receipts ?? 0)} l="proofs" />
        </div>
        {pass && pass.longestStreak > 0 && <p className="mt-3 text-xs text-emerald-300">Best streak: {pass.longestStreak} day{pass.longestStreak > 1 ? "s" : ""}</p>}
        <a href={pass?.registryUrl ?? "#"} target="_blank" rel="noreferrer"
           className="mt-4 flex items-center justify-between rounded-xl bg-black/30 px-3 py-2 text-sm ring-1 ring-[#14F195]/40">
          <span className="flex items-center gap-2"><SolanaMark className="h-5 w-5" /> <b>{pass?.anchored ?? 0}</b> of {t?.receipts ?? 0} proofs anchored on-chain</span>
          <span className="text-xs text-emerald-300">view all ↗</span>
        </a>
      </section>

      <label className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed py-8 text-lg ${busy ? "border-emerald-700 opacity-70" : "border-emerald-500 bg-emerald-900/40"}`}>
        <span className="text-4xl">{busy ? "🤖" : "📷"}</span>
        {busy ? STEPS[step] + "…" : "Scan a receipt"}
        <input type="file" accept="image/*" capture="environment" className="hidden" disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => tryDemo(1)} disabled={busy} className="rounded-xl border border-emerald-600 px-2 py-3 text-xs font-medium text-emerald-200 disabled:opacity-50">
          🧾 Demo: SuperBee Eco Shop
        </button>
        <button onClick={() => tryDemo(2)} disabled={busy} className="rounded-xl border border-emerald-600 px-2 py-3 text-xs font-medium text-emerald-200 disabled:opacity-50">
          🧾 Demo: Green Market
        </button>
      </div>

      {busy && (
        <ol className="space-y-1 rounded-xl bg-emerald-900/40 p-3 text-sm">
          {STEPS.map((l, i) => (
            <li key={l} className={i <= step ? "text-emerald-50" : "text-emerald-500"}>
              {i < step ? "✅" : i === step ? "⏳" : "○"} {l}
            </li>
          ))}
        </ol>
      )}

      {err && (
        <div className="rounded-lg bg-red-900/50 p-3 text-red-200">
          <p>🔒 {err}</p>
          {errLink && <a className="mt-1 block text-sm underline" href={errLink} target="_blank" rel="noreferrer">See the on-chain claim ↗</a>}
        </div>
      )}

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
          {res.signature ? (
            <a href={txUrl(res.signature)} target="_blank" rel="noreferrer"
               className="block rounded-xl bg-black/40 p-3 ring-1 ring-[#14F195]/60">
              <span className="flex items-center gap-2 font-semibold"><SolanaMark className="h-5 w-5" /> Anchored on Solana <span className="ml-auto text-xs font-normal text-emerald-300">view tx ↗</span></span>
              <span className="mt-1 block break-all font-mono text-[11px] text-emerald-300">tx {short(res.signature)}</span>
              <span className="block break-all font-mono text-[11px] text-emerald-400">sha256 {res.hash.slice(0, 24)}…</span>
            </a>
          ) : (
            <p className="rounded-xl bg-amber-900/40 p-3 text-xs text-amber-200">⏳ Saved. On-chain anchoring pending.</p>
          )}
          {res.claimAddress && (
            <a href={res.claimUrl ?? "#"} target="_blank" rel="noreferrer" className="block rounded-xl bg-black/40 p-3 text-sm ring-1 ring-[#9945FF]/60">
              🔒 <b>Receipt claimed on Solana</b> <span className="text-emerald-300">· it can never be counted again ↗</span>
              <span className="block break-all font-mono text-[11px] text-emerald-400">claim {short(res.claimAddress)}</span>
            </a>
          )}
          {lastFile && <button onClick={() => onFile(lastFile)} className="w-full rounded-xl border border-emerald-700 py-2 text-xs text-emerald-300">🔁 Try scanning this same receipt again</button>}
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
                    <span className="flex items-center justify-end gap-1 text-xs text-emerald-400">{r.signature ? <><SolanaMark className="h-3 w-3" />{short(r.signature)}</> : "pending"}</span>
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
