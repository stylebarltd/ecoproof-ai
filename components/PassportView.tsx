"use client";
import { useState } from "react";
import Link from "next/link";
import { Camera, Check, CircleHelp } from "lucide-react";
import QrScanner from "@/components/QrScanner";
import InstallPrompt from "@/components/InstallPrompt";
import AccountChip from "@/components/AccountChip";
import SharePassport from "@/components/SharePassport";
import { LogoLockup } from "@/components/Logo";
import { artSvg } from "@/lib/nftArt";
import { milestoneLabel, tierFor } from "@/lib/milestoneRules";
import { POINTS_PRESENCE, POINTS_VERIFIED } from "@/lib/stampClasses";
import { explorerAsset, explorerTx, progress, rankNfts } from "@/lib/passportView";
import type { Passport } from "@/lib/passport";

const short = (sig: string) => `${sig.slice(0, 5)}…${sig.slice(-5)}`;
const dataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

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
  const points = pass?.points ?? 0;
  const prog = progress(points, pass?.nextMilestone ?? 1); // ranks are reached by points: a verified purchase is worth more than a presence stamp
  const slots = Math.max(0, 8 - (pass?.places.length ?? 0));
  const t = pass?.totals;
  const [scanning, setScanning] = useState(false);

  return (
    <div className="space-y-4">
      <div className="passport-bg fixed inset-0 -z-10" aria-hidden />

      <header className="flex items-center justify-between">
        <h1><LogoLockup size={34} /></h1>
      </header>

      {owner && (
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-sage-900"><SolanaMark /> Verified on Solana · devnet</span>
          <AccountChip onChange={onAccountChange ?? (() => {})} />
        </div>
      )}
      {owner && <InstallPrompt stamps={stamps} />}
      {owner && stamps === 0 && (
        <Link href="/about" className="glass flex items-center gap-3 rounded-2xl px-4 py-3 ring-2 ring-honey-400/70">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-honey-500 text-ink"><CircleHelp size={20} strokeWidth={2.6} /></span>
          <span className="min-w-0 flex-1"><span className="block font-heading text-[15px] leading-tight">New here? See how EcoProof works</span><span className="block text-[11.5px] text-sage-900">Stamps, Eco Warrior NFTs and how to collect them, in one minute.</span></span>
        </Link>
      )}
      {owner && (
        <button onClick={() => setScanning(true)} className="glass flex w-full items-center justify-center gap-2 rounded-full py-3 font-heading text-[15px] text-ink">
          <Camera size={18} strokeWidth={2.5} /> Scan a QR to collect a stamp
        </button>
      )}
      {scanning && <QrScanner onClose={() => setScanning(false)} />}

      {/* 1. Hero: earned Eco Warrior NFTs, highest tier largest */}
      <Glass className="p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[17px]">Eco Warriors</h2>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-honey-700">Soulbound</span>
        </div>
        {top ? (
          <div className="space-y-3">
            <NftTile n={top} big wallet={!!pass?.wallet} />
            {rest.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5">
                {rest.map((n) => <NftTile key={n.id} n={n} wallet={!!pass?.wallet} />)}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUri(artSvg({ milestone: 1, proofs: 1, plasticItems: 0, co2Kg: 0, brand: "" }))} alt="Seedling, locked" width={180} height={180} className="rounded-3xl opacity-40 grayscale" />
            <p className="font-heading text-base">Your Seedling is waiting</p>
            <p className="text-xs text-sage-900">Collect your first stamp to unlock it. <Link href="/about#customers" className="font-bold underline">How do I collect one?</Link></p>
          </div>
        )}
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

      {/* 2. Stamp collection: verified purchases (premium, with their impact) and presence stamps (plainer), one passport */}
      <Glass className="p-4">
        <h2 className="text-[17px]">Stamp collection</h2>
        <p className="mb-3 mt-0.5 text-[11.5px] text-sage-900">
          <b>{points}</b> point{points === 1 ? "" : "s"} · {pass?.stampsByClass.verified ?? 0} verified purchase{(pass?.stampsByClass.verified ?? 0) === 1 ? "" : "s"} · {pass?.stampsByClass.presence ?? 0} presence stamp{(pass?.stampsByClass.presence ?? 0) === 1 ? "" : "s"}
        </p>

        {pass && pass.verifiedStamps.length > 0 && (
          <div className="mb-4 space-y-2.5">
            {pass.verifiedStamps.slice(0, 4).map((v) => (
              <Link key={v.id} href={`/p/${v.id}`} className="relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-honey-300/60 via-white/70 to-honey-300/30 p-3 ring-2 ring-honey-400 shadow-[0_10px_28px_rgba(232,163,23,0.4)]">
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
                  <span className="text-[10.5px] text-sage-900">{new Date(v.createdAt).toLocaleDateString()}</span>
                </span>
              </Link>
            ))}
            {pass.verifiedStamps.length > 4 && <p className="text-center text-[11px] font-semibold text-sage-900">+ {pass.verifiedStamps.length - 4} more verified purchases</p>}
          </div>
        )}

        <h3 className="mb-2 text-[13px] text-sage-900">Places you&apos;ve been <span className="font-sans text-[10.5px] font-semibold">· {POINTS_PRESENCE} point each</span></h3>
        <div className="grid grid-cols-4 gap-x-2 gap-y-3.5">
          {(pass?.places ?? []).map((pl) => (
            <Link key={pl.id} href={`/c/${pl.id}`} title={pl.name} className="flex flex-col items-center gap-1 text-center">
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
            Verified impact so far: {t.plasticItems} plastics avoided · {t.co2Kg.toFixed(1)} kg CO₂ saved
          </p>
        )}
      </Glass>

      {/* 4. Proof trail */}
      {pass && pass.records.length > 0 && (
        <Glass className="p-4">
          <h2 className="mb-1 text-[17px]">Proof trail</h2>
          <p className="mb-3 text-[11.5px] text-sage-900"><b>{pass.anchored}</b> of {stamps} anchored on Solana</p>
          <ul className="space-y-2">
            {pass.records.slice(0, 8).map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-white/45 p-2.5 ring-1 ring-white/60">
                {r.placeId && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/stamp-places/${r.placeId}/stamp`} alt="" width={36} height={36} className="shrink-0 rounded-full" />
                )}
                <Link href={`/p/${r.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{r.merchant}{r.source === "card" && <em className="ml-1.5 rounded-full bg-white/70 px-1.5 py-0.5 align-middle text-[9px] font-bold not-italic text-sage-800">card</em>}{r.class === "verified" && <em className="ml-1.5 rounded-full bg-honey-300 px-1.5 py-0.5 align-middle text-[9px] font-bold not-italic text-ink">verified purchase</em>}</span>
                  <span className="text-[11px] text-sage-900">{new Date(r.createdAt).toLocaleDateString()} · +{r.points} pt{r.points === 1 ? "" : "s"}</span>
                </Link>
                {r.signature ? (
                  <a href={explorerTx(r.signature)} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-sage-800 ring-1 ring-white/80">
                    <SolanaMark className="h-3 w-3" />{short(r.signature)}
                  </a>
                ) : <span className="shrink-0 text-[11px] text-sage-800">pending</span>}
              </li>
            ))}
          </ul>
          {pass.registryUrl && <a href={pass.registryUrl} target="_blank" rel="noreferrer" className="mt-3 block text-center text-[11px] text-sage-800 underline">All EcoProof proofs on Solana ↗</a>}
        </Glass>
      )}

      <p className="pb-1 pt-1 text-center text-[11.5px] font-semibold text-sage-900">
        <Link href="/about" className="underline">How EcoProof works</Link> · <Link href="/about#owners" className="underline">For shops</Link> · <Link href="/rules" className="underline">Eco rules</Link>
      </p>
    </div>
  );
}

function NftTile({ n, big, wallet }: { n: Passport["nfts"][number]; big?: boolean; wallet: boolean }) {
  const minted = n.status === "minted" && n.assetId;
  const body = (
    <div>
      <div className={`overflow-hidden rounded-3xl ring-2 ${big ? "ring-honey-400 shadow-[0_10px_34px_rgba(232,163,23,0.45)]" : "ring-white/80 shadow-md"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={n.imageUrl} alt={`Eco ${n.tier}, ${milestoneLabel(n.milestone)}`} width={512} height={512} className={`aspect-square w-full object-cover ${minted ? "" : "opacity-70"}`} />
      </div>
      <div className={`mt-1.5 text-center leading-tight ${big ? "" : "px-0.5"}`}>
        <div className={`font-heading ${big ? "text-lg" : "text-[13px]"}`}>{n.tier}</div>
        <div className={`${big ? "text-xs" : "text-[10px]"} font-semibold text-sage-900`}>
          {milestoneLabel(n.milestone)}
        </div>
        <div className={`${big ? "text-xs" : "text-[10px]"} text-honey-700 font-bold`}>{minted ? "View on Solana ↗" : wallet ? "Minting…" : "Sign in to claim"}</div>
      </div>
    </div>
  );
  return minted ? <a href={explorerAsset(n.assetId!)} target="_blank" rel="noreferrer" className="block">{body}</a> : body;
}
