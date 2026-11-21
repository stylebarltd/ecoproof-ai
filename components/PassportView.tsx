"use client";
import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import QrScanner from "@/components/QrScanner";
import ReceiptScanner from "@/components/ReceiptScanner";
import InstallPrompt from "@/components/InstallPrompt";
import AccountChip from "@/components/AccountChip";
import SharePassport from "@/components/SharePassport";
import { LogoLockup } from "@/components/Logo";
import BeeCard from "@/components/BeeCard";
import PassportMap from "@/components/PassportMap";
import { impactParts } from "@/lib/impact";
import { milestoneLabel, RANKS, rankWebp, tierFor } from "@/lib/milestoneRules";
import { POINTS_BY_KIND, POINTS_CARD, POINTS_VERIFIED } from "@/lib/stampClasses";
import { explorerAsset, explorerTx, NFT_STATE_LABEL, nftState, progress, rankNfts } from "@/lib/passportView";
import { AREA_COLOUR } from "@/lib/journeyMap";
import { SEASON_CARDS } from "@/lib/seasonRules";
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
  const toClaim = nfts.filter((n) => nftState(n, !!pass?.wallet) === "waiting").length;
  const points = pass?.points ?? 0;
  const prog = progress(points, pass?.nextMilestone ?? 1); // ranks are reached by points: a verified purchase is worth more than a presence stamp
  const slots = Math.max(0, 8 - (pass?.places.length ?? 0));
  const t = pass?.totals;
  const [scanning, setScanning] = useState(false);
  const [receipting, setReceipting] = useState(false); // the receipt door (eco shops, in the shop)
  const desktop = useDesktop(); // on desktop the wallet chip sits in the top navbar
  useAccountChange(owner ? onAccountChange : undefined);
  const smallRanks = (
    <div className="grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-4">
      {rest.map((n) => <div key={n.id} className="lift-soft"><BeeCard rank={tierFor(n.milestone)} nft={n} wallet={!!pass?.wallet} /></div>)}
      {(top ? locked : locked.slice(1)).map((r) => <BeeCard key={r.key} rank={r} />)}
    </div>
  );

  /* Season cards: only once the passport holds one (the season hands them out; lib/seasonRules.ts) */
  const seasonBox = pass && pass.season.length > 0 ? (
        <Glass className="p-4 lg:p-6">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[17px] lg:text-[19px]">Season 1 cards</h2>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-honey-700">{pass.season.length} of {SEASON_CARDS.length} designs</span>
          </div>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {pass.season.map((c) => {
              const st = nftState(c, !!pass.wallet);
              const inner = (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.webpUrl} alt="" width={512} height={512} loading="lazy" className="block aspect-square w-full rounded-[10px] object-cover" style={{ outline: `3px solid ${AREA_COLOUR[c.rank]}`, outlineOffset: "-3px" }} />
                  <span className="mt-1.5 block text-[13px] font-extrabold leading-tight text-sage-900">{c.name}</span>
                  <span className="block text-[11.5px] font-semibold leading-snug text-sage-900">{c.serial ? `#${c.serial} of ${c.cap}` : `1 of ${c.cap}`} · {NFT_STATE_LABEL[st]}</span>
                </>
              );
              return <li key={c.id} className="lift-soft">{st === "onchain" && c.assetId ? <a href={explorerAsset(c.assetId)} target="_blank" rel="noreferrer" aria-label={`${c.name}, on Solana`}>{inner}</a> : inner}</li>;
            })}
          </ul>
        </Glass>
      ) : null;
  const proofList = (
          <ul className="space-y-2">
            {(pass?.records ?? []).slice(0, owner ? 20 : 8).map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-white/45 p-2.5 ring-1 ring-white/60 transition hover:bg-white/65">
                {r.placeId && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/stamp-places/${r.placeId}/stamp`} alt="" width={36} height={36} className="shrink-0" />
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
  );

  return (
    <div className="space-y-4">
      <div className="passport-bg fixed inset-0 -z-10" aria-hidden />

      <header className="flex items-center justify-between">
        <h1><span className="lg:hidden"><LogoLockup size={34} /></span><span className="hidden text-[32px] leading-tight lg:inline">{owner ? "My eco passport" : "Eco passport"}</span></h1>
        {!owner && <Link href="/help#test-network" className="hidden text-sm text-sage-900 underline decoration-sage-900/30 underline-offset-2 lg:inline">Every stamp recorded on Solana · test network</Link>}
        {/* Phones: the account chip sits at the top right, beside the logo (Pola, 2026-11-21); on desktop it is in the navbar */}
        {owner && !desktop && <AccountChip onChange={onAccountChange ?? (() => {})} />}
      </header>

      {/* Owner tools. Desktop lays them out as a grid: Solana note left, scan button right, hints full width below. */}
      {owner && (
        <div className="space-y-4 lg:grid lg:grid-cols-[1fr_auto] lg:items-start lg:gap-x-6 lg:gap-y-4 lg:space-y-0">
          <div className="flex items-center justify-between gap-2">
            {/* "devnet" means nothing to a customer (Pola, 2026-11-20): say test network, and explain it one tap away */}
            <Link href="/help#test-network" className="inline-flex min-h-11 items-center gap-1.5 text-xs text-sage-900 underline decoration-sage-900/30 underline-offset-2 lg:text-sm"><SolanaMark /> Recorded on Solana · test network</Link>
          </div>
          <InstallPrompt stamps={stamps} />
        </div>
      )}
      {scanning && <QrScanner onClose={() => setScanning(false)} />}
      {receipting && <ReceiptScanner onClose={() => setReceipting(false)} />}

      {/* Owner view (Pola, 2026-11-20): the board is the page. Above it one compact strip says who you are (top rank, points, impact) and holds the NFT and share
          actions; the rank row, the stamp collection and the proof trail moved onto the board (stations, tiles and their notes). The public passport keeps the
          earlier sections below until its own layout is decided. */}
      {owner && (
        <Glass className="flex flex-wrap items-center gap-x-4 gap-y-3 p-3 lg:p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={rankWebp((top ? tierFor(top.milestone) : RANKS[0]).key)} alt="" width={72} height={72} className={`h-[72px] w-[72px] shrink-0 rounded-2xl object-cover ring-2 ring-white/80 ${top ? "" : "opacity-60 grayscale"}`} />
          <div className="min-w-0 flex-1 basis-[200px]">
            <p className="font-heading text-[19px] leading-tight">{top ? `${tierFor(top.milestone).name} Bee Guardian` : "Your Sentinel is waiting"}</p>
            <p className="text-[12.5px] font-semibold text-sage-900">{top ? `Tier ${tierFor(top.milestone).tier} of ${RANKS.length} · soulbound · ` : ""}{prog.text}</p>
            <div className="mt-1.5 h-2 max-w-[340px] overflow-hidden rounded-full bg-white/55 ring-1 ring-white/70" role="img" aria-label={prog.text}>
              <div className="h-full rounded-full bg-gradient-to-r from-honey-300 to-honey-500" style={{ width: `${Math.max(4, Math.round(prog.fraction * 100))}%` }} />
            </div>
            {t && (t.co2Kg > 0 || t.plasticG > 0) && <p className="mt-1.5 text-[12px] font-semibold text-sage-900">Verified impact so far: {impactParts(t).join(" · ")}</p>}
            {!top && <p className="mt-1 text-[12px] text-sage-900">Collect your first stamp to unlock it. <Link href="/scan" className="font-bold underline">Scan now</Link></p>}
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[250px]">
            {nfts.length > 0 && (
              <Link href="/collection" className={`lift flex min-h-11 items-center justify-between gap-2 rounded-2xl px-4 py-2 text-sm font-bold ${toClaim ? "bg-honey-500 text-ink shadow-[0_6px_20px_rgba(232,163,23,0.35)] ring-1 ring-white/60" : "glass"}`}>
                <span>{toClaim ? `${toClaim} waiting to claim · connect a wallet` : "My Bee Guardians on Solana"}</span><span aria-hidden>→</span>
              </Link>
            )}
            {stamps > 0 && <SharePassport passportId={passportId} stamps={stamps} points={points} tier={top ? tierFor(top.milestone).name : null} />}
          </div>
        </Glass>
      )}

      {/* The journey map: the trail from the start to the Paragon summit, the Bee Guardian stations and the ways to take a step */}
      <PassportMap
        points={points} toGo={prog.toGo} nextTier={prog.nextTier} nfts={nfts} season={pass?.season ?? []} wallet={!!pass?.wallet}
        ready={!!pass} owner={owner} steps={pass?.steps} onScan={owner ? () => setScanning(true) : undefined} onReceipt={owner ? () => setReceipting(true) : undefined}
      />

      {owner && pass && (
        <>
          {/* The places stamps came from: a slim row, since a place is not a spot on the trail (one visited five times is five tiles) */}
          {pass.places.some((pl) => pl.earned) && (
            <Glass className="p-4 lg:p-5">
              <h2 className="text-[17px]">Places you&apos;ve been</h2>
              <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-3">
                {pass.places.filter((pl) => pl.earned).map((pl) => (
                  <li key={pl.id}>
                    <Link href={`/places/${pl.id}`} className="lift-soft flex min-h-11 items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pl.imageUrl} alt="" width={44} height={44} className="h-11 w-11 shrink-0" />
                      <span className="leading-tight"><span className="block text-[13px] font-bold text-ink">{pl.name}</span><span className="block text-[11.5px] font-semibold text-sage-900">{pl.count} stamp{pl.count === 1 ? "" : "s"}{pl.verifiedCount ? ` · ${pl.verifiedCount} verified` : ""}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Glass>
          )}
          {seasonBox}
          {/* Every proof as a list, folded: the board shows a stamp on its tiles, but the trail ends at the last tile and a list can be read without pointing */}
          {pass.records.length > 0 && (
            <details className="glass rounded-[28px] p-4 lg:p-5">
              <summary className="cursor-pointer text-[15px] font-bold">All proofs <span className="font-semibold text-sage-900">· {pass.anchored} of {stamps} written to Solana</span></summary>
              <div className="mt-3">{proofList}</div>
            </details>
          )}
        </>
      )}

      {/* The public passport, as before. Phones: one column in this order. Desktop: left (sticky) hero + progress, right ranks row + stamps + proof trail. */}
      {!owner && <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-8 lg:space-y-0">
      <div className="space-y-4 lg:sticky lg:top-24">
      {/* 1. Hero: earned Bee Guardian NFTs, highest rank largest; ranks still to earn as silhouettes */}
      <Glass className="p-4 lg:p-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[17px]">Bee Guardians</h2>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-honey-700">Soulbound</span>
        </div>
        <div className="space-y-3">
          {top ? (
            <div className="mx-auto max-w-[300px] lg:max-w-[320px]"><BeeCard rank={tierFor(top.milestone)} nft={top} big wallet={!!pass?.wallet} impact={t && { plasticG: t.plasticG, co2Kg: t.co2Kg }} /></div>
          ) : (
            <div className="mx-auto max-w-[260px] text-center">
              <BeeCard rank={RANKS[0]} big />
              <p className="mt-2 font-heading text-base">Your Sentinel is waiting</p>
              <p className="text-xs text-sage-900">Collect your first stamp to unlock it. <Link href="/#how" className="font-bold underline">How do I collect one?</Link></p>
            </div>
          )}
          <div className="lg:hidden">{smallRanks}</div>
          <p className="hidden text-center lg:block"><span className="font-heading text-[40px] leading-none">{points}</span> <span className="text-sm font-semibold text-sage-900">eco point{points === 1 ? "" : "s"}</span></p>
        </div>
        {owner && nfts.length > 0 && (
          <Link href="/collection" className={`lift mt-3 flex items-center justify-between gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold ${toClaim ? "bg-honey-500 text-ink shadow-[0_6px_20px_rgba(232,163,23,0.35)] ring-1 ring-white/60" : "glass"}`}>
            <span>{toClaim ? `${toClaim} waiting to claim · connect a wallet` : "My Bee Guardians on Solana"}</span><span aria-hidden>→</span>
          </Link>
        )}
        {pass?.collectionUrl && <a href={pass.collectionUrl} target="_blank" rel="noreferrer" className="mt-3 block text-center text-[11px] text-sage-800 underline lg:hidden">The EcoProof Bee Guardians collection on Solana ↗</a>}
        {owner && stamps > 0 && <div className="mt-4"><SharePassport passportId={passportId} stamps={stamps} points={points} tier={top ? tierFor(top.milestone).name : null} /></div>}
      </Glass>

      {/* 3. Progress to the next milestone */}
      <Glass className="px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-heading text-[15px]">{prog.text}</p>
          <span className="text-[11px] text-sage-900">{points >= (pass?.nextMilestone ?? 1) && points > 0 ? "top rank" : `next: ${milestoneLabel(pass?.nextMilestone ?? 1)}`}</span>
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
        {pass?.collectionUrl && <a href={pass.collectionUrl} target="_blank" rel="noreferrer" className="mt-3 block text-right text-[12px] text-sage-800 underline hover:text-sage-900">The EcoProof Bee Guardians collection on Solana ↗</a>}
      </Glass>

      {seasonBox}

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
                    <img src={v.imageUrl} alt="" width={64} height={64} className="rounded-[26%] ring-2 ring-honey-500 ring-offset-2 ring-offset-white/80" />
                  )}
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-honey-500 text-ink ring-2 ring-white"><Check size={12} strokeWidth={3.4} /></span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-honey-700">Verified purchase <span className="rounded-full bg-honey-500 px-1.5 py-0.5 text-[9px] text-ink">+{POINTS_VERIFIED} pts</span></span>
                  <span className="block truncate font-heading text-[16px] leading-tight">{v.placeName}</span>
                  <span className="block text-[12px] font-bold leading-snug text-ink">{v.impactNote ?? impactParts(v).join(" · ")}</span>
                  {v.basis && <span className="block text-[10px] font-semibold text-sage-800">{v.basis === "shop" ? `Products declared by ${v.placeName}` : "EcoProof AI estimate"}</span>}
                  <span className="text-[10.5px] text-sage-900">{new Date(v.createdAt).toLocaleDateString()}</span>
                </span>
              </Link>
            ))}
            {pass.verifiedStamps.length > 4 && <p className="text-center xl:col-span-2 text-[11px] font-semibold text-sage-900">+ {pass.verifiedStamps.length - 4} more verified purchases</p>}
          </div>
        )}

        <h3 className="mb-2 text-[13px] text-sage-900">Places you&apos;ve been <span className="font-sans text-[10.5px] font-semibold">· {POINTS_BY_KIND.cafe} point a visit, {POINTS_CARD} for a parcel card</span></h3>
        <div className="grid grid-cols-4 gap-x-2 gap-y-3.5 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {(pass?.places ?? []).map((pl) => (
            <Link key={pl.id} href={`/c/${pl.id}`} title={pl.name} className="lift-soft flex flex-col items-center gap-1 text-center">
              <span className="relative">
                {pl.earned ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pl.imageUrl} alt={pl.name} width={68} height={68} className="rounded-[26%] shadow-sm ring-2 ring-white/80" />
                ) : (
                  <span className="relative block h-[68px] w-[68px] rounded-full border-2 border-dashed border-white/90 bg-white/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pl.imageUrl} alt={pl.name} width={64} height={64} className="absolute inset-0 m-auto opacity-25 grayscale" />
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
        {t && (t.co2Kg > 0 || t.plasticG > 0) && (
          <p className="mt-3.5 rounded-2xl bg-white/45 px-3 py-2 text-center text-xs font-semibold text-sage-900">
            Verified impact so far: {impactParts(t).join(" · ")}
          </p>
        )}
      </Glass>

      {/* 4. Proof trail */}
      {pass && pass.records.length > 0 && (
        <Glass className="p-4 lg:p-6">
          <h2 className="mb-1 text-[17px] lg:text-[19px]">Proof trail</h2>
          <p className="mb-3 text-[11.5px] text-sage-900"><b>{pass.anchored}</b> of {stamps} anchored on Solana</p>
          {proofList}
          {pass.registryUrl && <a href={pass.registryUrl} target="_blank" rel="noreferrer" className="mt-3 block text-center text-[11px] text-sage-800 underline">All EcoProof proofs on Solana ↗</a>}
        </Glass>
      )}
      </div>
      </div>}

      <p className="pb-1 pt-1 text-center text-[11.5px] font-semibold text-sage-900">
        <Link href="/#how" className="underline">How EcoProof works</Link> · <Link href="/help" className="underline">Help</Link> · <Link href="/help#points" className="underline">How points work</Link> · <Link href="/#businesses" className="underline">For shops</Link> · <Link href="/rules" className="underline">Eco rules</Link>
      </p>
    </div>
  );
}
