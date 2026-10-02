"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Camera, Check, Circle, Flame, Loader2, Lock, RefreshCw } from "lucide-react";
import InstallPrompt from "@/components/InstallPrompt";
import { LogoLockup } from "@/components/Logo";
import { prepareImage } from "@/lib/clientImage";
import { CREAM } from "@/lib/brand";
import type { Passport } from "@/lib/passport";

type Result = {
  id: string; merchant: string; hash: string; signature: string | null; claimAddress: string | null; claimUrl: string | null;
  items: { name: string; quantity: number; category: string }[];
  impact: { co2Kg: number; plasticItems: number; packagingG: number; sustainableItems: number };
};

const short = (sig: string) => `${sig.slice(0, 6)}…${sig.slice(-6)}`;
const txUrl = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
const STEPS = ["Scanning your receipt", "Calculating impact", "Anchoring proof on Solana"];

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
    const r = await fetch(`/api/passport?userId=${encodeURIComponent(id)}&tz=${new Date().getTimezoneOffset()}`);
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
      fd.append("receipt", await prepareImage(f));
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
  const SW = 2.5; // icon stroke width (design: Lucide-style, round caps)
  return (
    <div className="space-y-3.5">
      <header className="flex items-center justify-between">
        <h1><LogoLockup size={36} /></h1>
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${pass?.streak ? "bg-terra-500 text-cream" : "bg-terra-100 text-terra-700"}`}>
          <Flame size={16} strokeWidth={SW} /> {pass?.streak ?? 0}-day streak
        </div>
      </header>

      <a href={pass?.registryUrl ?? "https://solana.com"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-sage-700 underline">
        <SolanaMark className="h-3.5 w-3.5" /> Proofs on Solana · devnet
      </a>

      <InstallPrompt />

      <section className="flex flex-col gap-4 rounded-[28px] bg-terra-700 px-[18px] py-[22px]">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-terra-100">Your verified impact</span>
        <div className="flex items-baseline gap-2">
          <span className="font-heading text-[42px] leading-none text-cream">{(t?.co2Kg ?? 0).toFixed(1)} kg</span>
          <span className="font-heading text-[17px] text-terra-100">CO₂ saved</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={<><path d="M3 8l9-5 9 5-9 5-9-5z" /><path d="M3 8v9l9 5 9-5V8" /><path d="M12 13v9" /></>} v={String(t?.plasticItems ?? 0)} l="plastics avoided" />
          <Stat icon={<><path d="M12 3C7 3 4 7 4 12c0 4.5 3 8 8 8 4 0 7-3 7-7 0-6-4-10-7-10z" /><path d="M8 13l2.7 3L16 9" /></>} v={`${t?.packagingG ?? 0}g`} l="packaging cut" />
          <Stat icon={<><path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3z" /><path d="M9 12l2.5 2.5L15 10" /></>} v={String(t?.receipts ?? 0)} l="proofs" />
        </div>
        {pass && pass.longestStreak > 0 && <p className="text-xs text-terra-100">Best streak: {pass.longestStreak} day{pass.longestStreak > 1 ? "s" : ""}</p>}
      </section>

      {(() => {
        const latest = pass?.records[0];
        const inner = (
          <>
            <div className="flex flex-col gap-0.5">
              <span className="font-heading text-sm text-ink">Recent proof</span>
              <span className="text-[11.5px] text-sage-900"><b>{pass?.anchored ?? 0}</b> of {t?.receipts ?? 0} anchored on-chain · view details &amp; share</span>
            </div>
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-sage-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={CREAM} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.7l7.6-4.4M8.2 13.3l7.6 4.4" />
              </svg>
            </span>
          </>
        );
        const cls = "flex items-center justify-between gap-3 rounded-2xl bg-sage-100 px-3.5 py-3 ring-1 ring-sage-200";
        return latest ? <Link href={`/p/${latest.id}`} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
      })()}

      <label className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-terra-500 py-3 font-heading text-[15px] text-cream ${busy ? "opacity-70" : ""}`}>
        {busy ? <Loader2 size={20} strokeWidth={SW} className="animate-spin" /> : <Camera size={20} strokeWidth={SW} />}
        {busy ? STEPS[step] + "…" : "Scan a receipt"}
        <input type="file" accept="image/*" capture="environment" className="hidden" disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      </label>

      <div className="flex gap-2.5">
        <button onClick={() => tryDemo(1)} disabled={busy} className="flex-1 rounded-full border-[1.5px] border-neutral-300 px-2 py-3 text-xs font-semibold disabled:opacity-50">
          Demo: SuperBee Eco Shop
        </button>
        <button onClick={() => tryDemo(2)} disabled={busy} className="flex-1 rounded-full border-[1.5px] border-neutral-300 px-2 py-3 text-xs font-semibold disabled:opacity-50">
          Demo: Green Market
        </button>
      </div>

      {busy && (
        <ol className="space-y-1.5 rounded-2xl bg-neutral-100 p-3.5 text-sm">
          {STEPS.map((l, i) => (
            <li key={l} className={`flex items-center gap-2 ${i <= step ? "text-ink" : "text-neutral-500"}`}>
              {i < step ? <Check size={16} strokeWidth={SW} className="text-sage-600" /> : i === step ? <Loader2 size={16} strokeWidth={SW} className="animate-spin text-terra-600" /> : <Circle size={16} strokeWidth={SW} />} {l}
            </li>
          ))}
        </ol>
      )}

      {err && (
        <div className="rounded-2xl bg-terra-100 p-3.5 text-sm text-terra-800">
          <p className="flex items-start gap-2"><Lock size={16} strokeWidth={SW} className="mt-0.5 shrink-0" /> {err}</p>
          {errLink && <a className="mt-1 block text-xs underline" href={errLink} target="_blank" rel="noreferrer">See the on-chain claim ↗</a>}
        </div>
      )}

      {res && (
        <section className="space-y-3 rounded-[28px] bg-neutral-100 p-4">
          <h2 className="text-lg">{res.merchant}</h2>
          {res.impact.sustainableItems === 0 && <p className="text-sm text-terra-700">No sustainable items detected on this receipt.</p>}
          <ul className="text-sm">
            {res.items.map((i, k) => (
              <li key={k} className="flex justify-between gap-3 border-b border-neutral-200 py-1.5">
                <span>{i.quantity}× {i.name}</span>
                <span className={i.category === "not_sustainable" ? "text-neutral-400" : "shrink-0 text-sage-700"}>
                  {i.category === "not_sustainable" ? "—" : "✓ " + i.category.replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm font-semibold text-sage-700">
            +{res.impact.co2Kg} kg CO₂ · +{res.impact.plasticItems} plastics · +{res.impact.packagingG} g packaging
          </p>
          {res.signature ? (
            <a href={txUrl(res.signature)} target="_blank" rel="noreferrer" className="block rounded-2xl bg-white p-3 ring-1 ring-sage-300">
              <span className="flex items-center gap-2 font-semibold"><SolanaMark className="h-5 w-5" /> Anchored on Solana <span className="ml-auto text-xs font-normal text-sage-700">view tx ↗</span></span>
              <span className="mt-1 block break-all font-mono text-[11px] text-neutral-600">tx {short(res.signature)}</span>
              <span className="block break-all font-mono text-[11px] text-neutral-500">sha256 {res.hash.slice(0, 24)}…</span>
            </a>
          ) : (
            <p className="rounded-2xl bg-terra-100 p-3 text-xs text-terra-800">Saved. On-chain anchoring pending.</p>
          )}
          {res.claimAddress && (
            <a href={res.claimUrl ?? "#"} target="_blank" rel="noreferrer" className="block rounded-2xl bg-white p-3 text-sm ring-1 ring-sage-300">
              <span className="flex items-center gap-2"><Lock size={16} strokeWidth={SW} className="text-sage-700" /> <b>Receipt claimed on Solana</b></span>
              <span className="block text-xs text-neutral-600">It can never be counted again ↗</span>
              <span className="block break-all font-mono text-[11px] text-neutral-500">claim {short(res.claimAddress)}</span>
            </a>
          )}
          {lastFile && (
            <button onClick={() => onFile(lastFile)} className="flex w-full items-center justify-center gap-1.5 rounded-full border-[1.5px] border-neutral-300 py-2 text-xs font-semibold text-neutral-700">
              <RefreshCw size={14} strokeWidth={SW} /> Try scanning this same receipt again
            </button>
          )}
          <Link href={`/p/${res.id}`} className="block rounded-full bg-terra-500 py-3 text-center font-heading text-[15px] text-cream">
            Open share card
          </Link>
        </section>
      )}

      <section className="pt-1">
        <h2 className="mb-2.5 text-[15px]">Badges</h2>
        <div className="grid grid-cols-4 gap-y-3">
          {(pass?.badges ?? []).map((b) => (
            <div key={b.id} title={b.desc} className="flex flex-col items-center gap-1.5 text-center">
              <span className={`flex h-11 w-11 items-center justify-center rounded-full text-xl ${b.earned ? "bg-sage-500" : "border-2 border-dashed border-neutral-300"}`}>
                {b.earned ? b.icon : <Lock size={16} strokeWidth={SW} className="text-neutral-400" />}
              </span>
              <span className={`text-[10px] leading-tight ${b.earned ? "font-semibold text-ink" : "text-neutral-500"}`}>{b.name}</span>
            </div>
          ))}
        </div>
      </section>

      {pass && pass.records.length > 0 && (
        <section className="pt-1">
          <h2 className="mb-2.5 text-[15px]">Recent proofs</h2>
          <ul className="space-y-2">
            {pass.records.map((r) => (
              <li key={r.id}>
                <Link href={`/p/${r.id}`} className="flex items-center justify-between rounded-2xl bg-neutral-100 p-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{r.merchant}</span>
                    <span className="text-xs text-neutral-600">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold text-sage-700">{r.co2Kg} kg</span>
                    <span className="flex items-center justify-end gap-1 text-xs text-neutral-600">{r.signature ? <><SolanaMark className="h-3 w-3" />{short(r.signature)}</> : "pending"}</span>
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

function Stat({ icon, v, l }: { icon: React.ReactNode; v: string; l: string }) {
  return (
    <div className="flex flex-col items-center gap-[5px] rounded-2xl bg-terra-800 px-1.5 py-2.5">
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-cream">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8c491a" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{icon}</svg>
      </span>
      <div className="font-heading text-[17px] text-cream">{v}</div>
      <div className="text-center text-[10px] text-terra-100">{l}</div>
    </div>
  );
}
