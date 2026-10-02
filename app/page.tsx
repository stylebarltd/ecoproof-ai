"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Lock } from "lucide-react";
import InstallPrompt from "@/components/InstallPrompt";
import { LogoLockup } from "@/components/Logo";
import AccountChip from "@/components/AccountChip";
import { CREAM } from "@/lib/brand";
import type { Passport } from "@/lib/passport";

const short = (sig: string) => `${sig.slice(0, 6)}…${sig.slice(-6)}`;

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

  const load = useCallback(async (id: string): Promise<Passport | null> => {
    const r = await fetch(`/api/passport?userId=${encodeURIComponent(id)}&tz=${new Date().getTimezoneOffset()}`);
    if (!r.ok) return null;
    const data: Passport = await r.json();
    setPass(data);
    return data;
  }, []);

  useEffect(() => {
    const init = async () => {
      const id = getUserId();
      setUserId(id);
      await load(id);
    };
    init();
  }, [load]);

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

      <div className="flex items-center justify-between gap-2">
        <a href={pass?.registryUrl ?? "https://solana.com"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-sage-700 underline">
          <SolanaMark className="h-3.5 w-3.5" /> Proofs on Solana · devnet
        </a>
        <AccountChip onChange={() => { if (userId) load(userId); }} />
      </div>

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

      {pass && (pass.nfts.length > 0 || pass.nextMilestone) && (
        <section className="pt-1">
          <h2 className="mb-1 text-[15px]">Eco Warrior NFTs</h2>
          <p className="mb-2.5 text-[11.5px] text-neutral-600">
            Soulbound badges for your milestones{pass.nextMilestone ? ` · next at ${pass.nextMilestone} proofs (${pass.nextMilestone - (t?.receipts ?? 0)} to go)` : ""}.
          </p>
          {pass.nfts.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {pass.nfts.map((n) => (
                <div key={n.id} className="overflow-hidden rounded-2xl bg-neutral-100 ring-1 ring-sage-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={n.imageUrl} alt={`${n.tier} eco warrior`} width={512} height={512} loading="lazy" className={`aspect-square w-full object-cover ${n.status === "minted" ? "" : "opacity-60"}`} />
                  <div className="p-2.5">
                    <div className="font-heading text-sm">{n.tier}</div>
                    <div className="text-[11px] text-neutral-600">{n.milestone === 1 ? "First proof" : `${n.milestone} proofs`}</div>
                    <div className="mt-1 text-[11px] font-semibold text-sage-700">
                      {n.status === "minted" && n.assetId ? <a href={`https://explorer.solana.com/address/${n.assetId}?cluster=devnet`} target="_blank" rel="noreferrer" className="underline">Soulbound · view on Solana</a> : pass.wallet ? "Minting…" : "Sign in with a wallet to claim"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

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
