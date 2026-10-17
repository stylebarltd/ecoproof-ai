"use client";
import { useState } from "react";
import Link from "next/link";
import { Camera, Check, CircleHelp } from "lucide-react";
import QrScanner from "@/components/QrScanner";
import InstallPrompt from "@/components/InstallPrompt";
import AccountChip from "@/components/AccountChip";
import SharePassport from "@/components/SharePassport";
import { LogoLockup } from "@/components/Logo";
import BeeCard from "@/components/BeeCard";
import { impactParts } from "@/lib/impact";
import { milestoneLabel, RANKS, tierFor } from "@/lib/milestoneRules";
import { POINTS_PRESENCE, POINTS_VERIFIED } from "@/lib/stampClasses";
import { explorerTx, progress, rankNfts } from "@/lib/passportView";
import { useAccountChange, useDesktop } from "@/lib/desktop";
import type { Passport } from "@/lib/passport";

const short = (sig: string) => `${sig.slice(0, 5)}…${sig.slice(-5)}`;

function SolanaMark({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs><linearGradient id="sol" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#9945FF" /><stop offset="1" stopColor="#14F195" /></linearGradient></defs>
      <g fill="url(#sol)"><polygon points="5,3.5 22,3.5 19,7.5 2,7.5" /><polygon points="2,10 19,10 22,14 5,14" /><polygon points="5,16.5 22,16.5 19,20.5 2,20.5" /></g>
    </svg>
  );
}

const Glass = ({ className = "", children }: { className?: string; children: React.ReactNode }) => <section className={`glass rounded-[28px] ${className}`}>{children}</section>;

export default function PassportView({ pass, passportId, owner, onAccountChange }: { pass: Passport | null; passportId: string; owner: boolean; onAccountChange?: () => void }) {
  const stamps = pass?.totals.receipts ?? 0;
  const nfts = rankNfts(pass?.nfts ?? []);
  const [top, ...rest] = nfts;
  const locked = RANKS.filter((r) => !nfts.some((n) => n.rank === r.key)); // ranks not earned yet, shown as silhouettes
  const points = pass?.points ?? 0;
  const prog = progress(points, pass?.nextMilestone ?? 1); // ranks are reached by points: a verified purchase is worth more than a presence stamp
  const slots = Math.max(0, 8 - (pass?.places.length ?? 0));
  const t = pass?.totals;
  const [scanning, setScanning] = useState(false);
  const desktop = useDesktop(); // on desktop the wallet chip sits in the top navbar
  useAccountChange(owner ? onAccountChange : undefined);
  const smallRanks = (
    <div className="grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-4">
      {rest.map((n) => <div key={n.id} className="lift-soft"><BeeCard rank={tierFor(n.milestone)} nft={n} wallet={!!pass?.wallet} /></div>)}
      {(top ? locked : locked.slice(1)).map((r) => <BeeCard key={r.key} rank={r} />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="passport-bg fixed inset-0 -z-10" aria-hidden />

      <header className="flex items-center justify-between">
        <h1><span className="lg:hidden"><LogoLockup size={34} /></span><span className="hidden text-[32px] leading-tight lg:inline">{owner ? "My eco passport" : "Eco passport"}</span></h1>
        {!owner && <span className="hidden text-sm text-sage-900 lg:inline">Every stamp verified on Solana · devnet</span>}
      </header>

      {/* Owner tools. Desktop lays them out as a grid: Solana note left, scan button right, hints full width below. */}
      {owner && (
        <div className="space-y-4 lg:grid lg:grid-cols-[1fr_auto] lg:items-start lg:gap-x-6 lg:gap-y-4 lg:space-y-0">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-sage-900 lg:text-sm"><SolanaMark /> Verified on Solana · devnet</span>
            {!desktop && <AccountChip onChange={onAccountChange ?? (() => {})} />}
          </div>
          <InstallPrompt stamps={stamps} />
          {stamps === 0 && (
            <Link href="/about" className="glass lift flex items-center gap-3 rounded-2xl px-4 py-3 ring-2 ring-honey-400/70 lg:col-span-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-honey-500 text-ink"><CircleHelp size={20} strokeWidth={2.6} /></span>
              <span className="min-w-0 flex-1"><span className="block font-heading text-[15px] leading-tight">New here? See how EcoProof works</span><span className="block text-[11.5px] text-sage-900">Stamps, Bee Guardian NFTs and how to collect them, in one minute.</span></span>
            </Link>
          )}
          <div className="lg:col-start-2 lg:row-start-1 lg:text-right">
            <button onClick={() => setScanning(true)} className="glass lift flex w-full items-center justify-center gap-2 rounded-full py-3 font-heading text-[15px] text-ink lg:px-6">
              <Camera size={18} strokeWidth={2.5} /> Scan a QR to collect a stamp
            </button>
            <p className="mt-1.5 hidden text-[11.5px] text-sage-900 lg:block">On a computer? Scan with your phone&apos;s camera, or use a webcam here.</p>
          </div>
        </div>
      )}
      {scanning && <QrScanner onClose={() => setScanning(false)} />}

      {/* Phones: one column in this order. Desktop: left (sticky) hero + progress, right ranks row + stamps + proof trail. */}
      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-8 lg:space-y-0">
      <div className="space-y-4 lg:sticky lg:top-24">
      {/* 1. Hero: earned Bee Guardian NFTs, highest rank largest; ranks still to earn as silhouettes */}
      <Glass className="p-4 lg:p-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[17px]">Bee Guardians</h2>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-honey-700">Soulbound</span>
        </div>
        <div className="space-y-3">
          {top ? (
            <div className="mx-auto max-w-[300px] lg:max-w-[320px]"><BeeCard rank={tierFor(top.milestone)} nft={top} big wallet={!!pass?.wallet} impact={t && { plasticItems: t.plasticItems, co2Kg: t.co2Kg, replaces: pass?.replaces }} /></div>
          ) : (
            <div className="mx-auto max-w-[260px] text-center">
              <BeeCard rank={RANKS[0]} big />
              <p className="mt-2 font-heading text-base">Your Sentinel is waiting</p>
              <p className="text-xs text-sage-900">Collect your first stamp to unlock it. <Link href="/about#customers" className="font-bold underline">How do I collect one?</Link></p>
            </div>
          )}
          <div className="lg:hidden">{smallRanks}</div>
          <p className="hidden text-center lg:block"><span className="font-heading text-[40px] leading-none">{points}</span> <span className="text-sm font-semibold text-sage-900">eco point{points === 1 ? "" : "s"}</span></p>
        </div>
        {pass?.collectionUrl && <a href={pass.collectionUrl} target="_blank" rel="noreferrer" className="mt-3 block text-center text-[11px] text-sage-800 underline lg:hidden">The EcoProof AI Bee Guardians collection on Solana ↗</a>}
        {owner && stamps > 0 && <div className="mt-4"><SharePassport passportId={passportId} stamps={stamps} points={points} tier={top ? tierFor(top.milestone).name : null} /></div>}
      </Glass>

      {/* 3. Progress to the next milestone */}
      <Glass className="px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-heading text-[15px]">{prog.text}</p>
          <span className="text-[11px] text-sage-900">next: {milestoneLabel(pass?.nextMilestone ?? 1)}</span>
        </div>
        <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-white/55 ring-1 ring-white/70">
          <div className="h-full rounded-full bg-gradient-to-r from-honey-300 to-honey-500" style={{ width: `${Math.max(4, Math.round(prog.fraction * 100))}%` }} />
        </div>
      </Glass>
      </div>

      <div className="space-y-4 lg:space-y-6">
      {/* Desktop: all five ranks in a row, earned bright, the rest dimmed with the points they unlock at */}
      <Glass className="hidden p-6 lg:block">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[19px]">Bee Guardian ranks</h2>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-honey-700">{nfts.length ? `${new Set(nfts.map((n) => n.rank)).size} of ${RANKS.length} earned` : "Soulbound"}</span>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {RANKS.map((r) => {
            const n = nfts.find((x) => x.rank === r.key); // highest edition first
            return n ? <div key={r.key} className="lift-soft"><BeeCard rank={r} nft={n} wallet={!!pass?.wallet} /></div> : <BeeCard key={r.key} rank={r} />;
          })}
        </div>
        {pass?.collectionUrl && <a href={pass.collectionUrl} target="_blank" rel="noreferrer" className="mt-3 block text-right text-[12px] text-sage-800 underline hover:text-sage-900">The EcoProof AI Bee Guardians collection on Solana ↗</a>}
      </Glass>

      {/* 2. Stamp collection: verified purchases (premium, with their impact) and presence stamps (plainer), one passport */}
      <Glass className="p-4 lg:p-6">
        <h2 className="text-[17px] lg:text-[19px]">Stamp collection</h2>
        <p className="mb-3 mt-0.5 text-[11.5px] text-sage-900">
          <b>{points}</b> point{points === 1 ? "" : "s"} · {pass?.stampsByClass.verified ?? 0} verified purchase{(pass?.stampsByClass.verified ?? 0) === 1 ? "" : "s"} · {pass?.stampsByClass.presence ?? 0} presence stamp{(pass?.stampsByClass.presence ?? 0) === 1 ? "" : "s"}
        </p>

        {pass && pass.verifiedStamps.length > 0 && (
          <div className="mb-4 space-y-2.5 xl:grid xl:grid-cols-2 xl:gap-3 xl:space-y-0">
            {pass.verifiedStamps.slice(0, 4).map((v) => (
              <Link key={v.id} href={`/p/${v.id}`} className="lift relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-honey-300/60 via-white/70 to-honey-300/30 p-3 ring-2 ring-honey-400 shadow-[0_10px_28px_rgba(232,163,23,0.4)]">
                <span className="relative shrink-0">
                  {v.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.imageUrl} alt="" width={64} height={64} className="rounded-full ring-2 ring-honey-500 ring-offset-2 ring-offset-white/80" />
                  )}
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-honey-500 text-ink ring-2 ring-white"><Check size={12} strokeWidth={3.4} /></span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-honey-700">Verified purchase <span className="rounded-full bg-honey-500 px-1.5 py-0.5 text-[9px] text-ink">+{POINTS_VERIFIED} pts</span></span>
                  <span className="block truncate font-heading text-[16px] leading-tight">{v.placeName}</span>
                  <span className="block text-[12px] font-bold leading-snug text-ink">{v.impactNote ?? `${v.plasticItems} single-use plastics avoided · ${v.co2Kg} kg CO₂ saved`}</span>
                  {v.basis && <span className="block text-[10px] font-semibold text-sage-800">{v.basis === "shop" ? `Numbers confirmed by ${v.placeName}` : "EcoProof estimate"}</span>}
                  <span className="text-[10.5px] text-sage-900">{new Date(v.createdAt).toLocaleDateString()}</span>
                </span>
              </Link>
            ))}
            {pass.verifiedStamps.length > 4 && <p className="text-center xl:col-span-2 text-[11px] font-semibold text-sage-900">+ {pass.verifiedStamps.length - 4} more verified purchases</p>}
          </div>
        )}

        <h3 className="mb-2 text-[13px] text-sage-900">Places you&apos;ve been <span className="font-sans text-[10.5px] font-semibold">· {POINTS_PRESENCE} point each</span></h3>
        <div className="grid grid-cols-4 gap-x-2 gap-y-3.5 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {(pass?.places ?? []).map((pl) => (
            <Link key={pl.id} href={`/c/${pl.id}`} title={pl.name} className="lift-soft flex flex-col items-center gap-1 text-center">
              <span className="relative">
                {pl.earned ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pl.imageUrl} alt={pl.name} width={68} height={68} className="rounded-full shadow-sm ring-2 ring-white/80" />
                ) : (
                  <span className="relative block h-[68px] w-[68px] rounded-full border-2 border-dashed border-white/90 bg-white/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pl.imageUrl} alt={pl.name} width={64} height={64} className="absolute inset-0 m-auto rounded-full opacity-25 grayscale" />
                  </span>
                )}
                {pl.count > 1 && <span className="absolute -right-1 -top-1 rounded-full bg-white px-1.5 text-[10px] font-extrabold text-sage-900 ring-2 ring-white/80">×{pl.count}</span>}
                {pl.verifiedCount > 0 && <span className="absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-honey-500 text-ink ring-2 ring-white" title="Includes a verified purchase"><Check size={11} strokeWidth={3.4} /></span>}
              </span>
              <span className={`text-[10px] leading-tight ${pl.earned ? "font-bold text-ink" : "text-sage-800"}`}>{pl.name}</span>
            </Link>
          ))}
          {Array.from({ length: slots }, (_, i) => (
            <div key={`s${i}`} className="flex flex-col items-center gap-1" aria-hidden>
              <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-2 border-dashed border-white/80 bg-white/10 text-xl text-white/90">+</span>
              <span className="text-[10px] text-sage-800">soon</span>
            </div>
          ))}
        </div>
        {t && (t.co2Kg > 0 || t.plasticItems > 0) && (
          <p className="mt-3.5 rounded-2xl bg-white/45 px-3 py-2 text-center text-xs font-semibold text-sage-900">
            Verified impact so far: {impactParts({ plasticItems: t.plasticItems, co2Kg: t.co2Kg, replaces: pass?.replaces }, 3).map((p, i) => (i ? p : p[0].toLowerCase() + p.slice(1))).join(" · ")}
          </p>
        )}
      </Glass>

      {/* 4. Proof trail */}
      {pass && pass.records.length > 0 && (
        <Glass className="p-4 lg:p-6">
          <h2 className="mb-1 text-[17px] lg:text-[19px]">Proof trail</h2>
          <p className="mb-3 text-[11.5px] text-sage-900"><b>{pass.anchored}</b> of {stamps} anchored on Solana</p>
          <ul className="space-y-2">
            {pass.records.slice(0, 8).map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-white/45 p-2.5 ring-1 ring-white/60 transition hover:bg-white/65">
                {r.placeId && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/stamp-places/${r.placeId}/stamp`} alt="" width={36} height={36} className="shrink-0 rounded-full" />
                )}
                <Link href={`/p/${r.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{r.merchant}{r.source === "card" && <em className="ml-1.5 rounded-full bg-white/70 px-1.5 py-0.5 align-middle text-[9px] font-bold not-italic text-sage-800">card</em>}{r.class === "verified" && <em className="ml-1.5 rounded-full bg-honey-300 px-1.5 py-0.5 align-middle text-[9px] font-bold not-italic text-ink">verified purchase</em>}</span>
                  <span className="text-[11px] text-sage-900">{new Date(r.createdAt).toLocaleDateString()} · {r.points ? `+${r.points} pt${r.points === 1 ? "" : "s"}` : "already counted that day"}</span>
                </Link>
                {r.signature ? (
                  <a href={explorerTx(r.signature)} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-sage-800 ring-1 ring-white/80 transition hover:bg-white hover:ring-honey-400">
                    <SolanaMark className="h-3 w-3" />{short(r.signature)}
                  </a>
                ) : <span className="shrink-0 text-[11px] text-sage-800">pending</span>}
              </li>
            ))}
          </ul>
          {pass.registryUrl && <a href={pass.registryUrl} target="_blank" rel="noreferrer" className="mt-3 block text-center text-[11px] text-sage-800 underline">All EcoProof AI proofs on Solana ↗</a>}
        </Glass>
      )}
      </div>
      </div>

      <p className="pb-1 pt-1 text-center text-[11.5px] font-semibold text-sage-900">
        <Link href="/about" className="underline">How EcoProof works</Link> · <Link href="/about#owners" className="underline">For shops</Link> · <Link href="/rules" className="underline">Eco rules</Link>
      </p>
    </div>
  );
}
