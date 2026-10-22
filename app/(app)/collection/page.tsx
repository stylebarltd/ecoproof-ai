"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, Clock, Loader2, RefreshCw, Wallet } from "lucide-react";
import AccountChip, { WalletSheet } from "@/components/AccountChip";
import BeeCard from "@/components/BeeCard";
import { getUserId } from "@/lib/clientUser";
import { announceAccountChange, useAccountChange, useDesktop } from "@/lib/desktop";
import { tierFor } from "@/lib/milestoneRules";
import { explorerAsset, explorerTx, NFT_STATE_LABEL, nftState, rankNfts, type NftState } from "@/lib/passportView";
import { shortAddress } from "@/lib/wallet";
import type { Nft } from "@/lib/milestones";

type Collection = { signedIn: boolean; wallet: string | null; minting: boolean; collectionUrl: string | null; nfts: Nft[] };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const POLL_MS = 4000, POLL_FOR_MS = 3 * 60_000;

const PILL: Record<NftState, string> = {
  waiting: "bg-honey-300 text-ink",
  queued: "bg-sage-100 text-sage-800",
  minting: "bg-sage-100 text-sage-800",
  retrying: "bg-terra-100 text-terra-800",
  onchain: "bg-sage-600 text-cream",
};

/** Every Bee Guardian of this passport with where it is: waiting for a wallet, minting, or on Solana (with Explorer links). */
export default function CollectionPage() {
  const [data, setData] = useState<Collection | null>(null);
  const [sheet, setSheet] = useState(false);
  const [err, setErr] = useState("");
  const [poll, setPoll] = useState({ until: 0, kick: 0 });
  const desktop = useDesktop();

  const load = useCallback(async () => {
    const r = await fetch(`/api/nfts?userId=${encodeURIComponent(getUserId())}`, { cache: "no-store" });
    if (r.ok) setData(await r.json());
  }, []);
  useEffect(() => { const init = async () => { setPoll({ until: Date.now() + POLL_FOR_MS, kick: 0 }); await load(); }; init(); }, [load]);
  useAccountChange(load);

  const states = (data?.nfts ?? []).map((n) => nftState(n, !!data?.wallet));
  const count = (s: NftState) => states.filter((x) => x === s).length;
  const inFlight = count("queued") + count("minting");

  // Mints run on the server after the request, so check back every few seconds while any are on their way (for a few minutes at most).
  // Right after a wallet connects or "Try again", keep checking briefly even before the server has picked them up.
  useEffect(() => {
    const now = Date.now();
    if (!data?.minting || now > poll.until || (!inFlight && now > poll.kick)) return;
    const t = setTimeout(() => { void load(); }, POLL_MS);
    return () => clearTimeout(t);
  }, [data, inFlight, poll, load]);
  const watch = () => setPoll({ until: Date.now() + POLL_FOR_MS, kick: Date.now() + 20_000 });

  async function retry() {
    setErr("");
    const r = await fetch("/api/nfts", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || "Couldn't start the mint."); return; }
    watch();
    await load();
  }

  const nfts = rankNfts(data?.nfts ?? []);
  const waiting = count("waiting"), retrying = count("retrying"), onchain = count("onchain");

  return (
    <div className="space-y-4 lg:mx-auto lg:max-w-[880px]">
      <div className="passport-bg fixed inset-0 -z-10" aria-hidden />
      <div className="flex items-center justify-between gap-2">
        <div>
          <Link href="/passport" className="text-xs font-bold text-sage-800">← Passport</Link>
          <h1 className="text-[22px] leading-tight lg:text-[30px]">My Bee Guardians</h1>
        </div>
        {!desktop && <AccountChip onChange={load} />}
      </div>

      {data === null ? <Loader2 size={24} className="mx-auto animate-spin text-sage-700" /> : (
        <>
          <section className="glass rounded-[22px] p-4 lg:p-5">
            {nfts.length === 0 ? (
              <>
                <h2 className="text-[17px]">No Bee Guardians yet</h2>
                <p className="mt-1 text-sm text-sage-900">Your first one, a Sentinel, unlocks with your first stamp. <Link href="/about#customers" className="font-bold underline">How do I collect one?</Link></p>
              </>
            ) : waiting > 0 ? (
              <>
                <h2 className="text-[17px]">{waiting} Bee Guardian{waiting === 1 ? "" : "s"} waiting to claim</h2>
                <p className="mt-1 text-sm text-sage-900">
                  Connect a Solana wallet and we mint {waiting === 1 ? "it" : "them"} to it, free. Bee Guardians are soulbound: once minted they stay in that wallet
                  for good, so connect the one you want to keep them in.
                </p>
                {!data.minting && <p className="mt-2 text-xs text-sage-900">Minting isn&apos;t switched on here yet. Your Bee Guardians are saved and mint as soon as it is.</p>}
                <button onClick={() => setSheet(true)} className="lift mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-honey-500 py-3 font-heading text-[15px] text-ink shadow-[0_6px_20px_rgba(232,163,23,0.45)] ring-1 ring-white/60 sm:w-auto sm:px-6">
                  <Wallet size={17} strokeWidth={2.5} /> {data.signedIn ? "Connect a wallet" : "Sign in with a wallet"}
                </button>
                {!data.signedIn && <p className="mt-2 text-xs text-sage-900">The stamps on this device come with you.</p>}
              </>
            ) : inFlight > 0 && data.minting ? (
              <>
                <h2 className="flex items-center gap-2 text-[17px]"><Loader2 size={18} className="animate-spin text-sage-700" /> Minting {inFlight} to {shortAddress(data.wallet!)}</h2>
                <p className="mt-1 text-sm text-sage-900">This takes about a minute each. You can leave this page; they keep going.</p>
              </>
            ) : retrying > 0 ? (
              <>
                <h2 className="text-[17px]">{retrying} couldn&apos;t be minted yet</h2>
                <p className="mt-1 text-sm text-sage-900">Solana didn&apos;t confirm the last try. Nothing is lost: we try again with your next stamp, or now.</p>
                <button onClick={retry} className="glass lift mt-3 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold"><RefreshCw size={15} strokeWidth={2.5} /> Try again</button>
              </>
            ) : inFlight > 0 ? (
              <>
                <h2 className="text-[17px]">Saved, minting soon</h2>
                <p className="mt-1 text-sm text-sage-900">Minting isn&apos;t switched on here yet. Your Bee Guardians are saved and mint to {shortAddress(data.wallet!)} as soon as it is.</p>
              </>
            ) : (
              <>
                <h2 className="flex items-center gap-2 text-[17px]"><Check size={18} strokeWidth={3} className="text-sage-700" /> All {onchain} on Solana</h2>
                <p className="mt-1 text-sm text-sage-900">In your wallet <span className="font-mono font-bold">{shortAddress(data.wallet ?? nfts[0].wallet ?? "")}</span>. Open Phantom or Solflare and look under collectibles.</p>
              </>
            )}
            {err && <p className="mt-3 rounded-xl bg-terra-100 p-2.5 text-sm text-terra-800">{err}</p>}
          </section>

          {nfts.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {nfts.map((n) => {
                const st = nftState(n, !!data.wallet);
                const serial = n.serial ? ` #${String(n.serial).padStart(4, "0")}` : "";
                return (
                  <li key={n.id} className="glass flex gap-3 rounded-[22px] p-3">
                    <div className="w-[118px] shrink-0"><BeeCard rank={tierFor(n.milestone)} nft={n} wallet={!!data.wallet} /></div>
                    <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
                      <h3 className="font-heading text-[17px] leading-tight">{n.tier}{n.rank === "paragon" ? ` · Ed. ${n.edition}` : ""}{serial}</h3>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${PILL[st]}`}>
                        {st === "onchain" ? <Check size={12} strokeWidth={3} /> : st === "waiting" ? <Clock size={12} strokeWidth={2.6} /> : st === "retrying" ? <RefreshCw size={12} strokeWidth={2.6} /> : <Loader2 size={12} className="animate-spin" />}
                        {NFT_STATE_LABEL[st]}
                      </span>
                      <p className="text-xs text-sage-900">Unlocked {day(n.createdAt)}</p>
                      {st === "onchain" ? (
                        <>
                          <p className="text-xs text-sage-900">Minted {n.mintedAt ? day(n.mintedAt) : ""}{n.wallet ? <> to <span className="font-mono">{shortAddress(n.wallet)}</span></> : null}</p>
                          <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-bold text-sage-800">
                            <a href={explorerAsset(n.assetId!)} target="_blank" rel="noreferrer" className="underline">View NFT ↗</a>
                            {n.mintSignature && <a href={explorerTx(n.mintSignature)} target="_blank" rel="noreferrer" className="underline">Mint ↗</a>}
                            {n.freezeSignature && <a href={explorerTx(n.freezeSignature)} target="_blank" rel="noreferrer" className="underline">Soulbound lock ↗</a>}
                          </p>
                        </>
                      ) : st === "waiting" ? (
                        <p className="text-xs text-sage-900">Saved for you. It mints when you connect a wallet.</p>
                      ) : (
                        <p className="text-xs text-sage-900">To <span className="font-mono">{shortAddress(data.wallet!)}</span></p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="text-xs text-sage-900">
            Bee Guardians are earned with eco points, never bought, and can&apos;t be sold or sent on.
            {data.collectionUrl && <> <a href={data.collectionUrl} target="_blank" rel="noreferrer" className="font-bold underline">The collection on Solana ↗</a></>}
          </p>
        </>
      )}

      {sheet && data && (
        <WalletSheet
          connect={data.signedIn}
          onClose={() => setSheet(false)}
          onSignedIn={() => { announceAccountChange(); watch(); void load(); }}
        />
      )}
    </div>
  );
}
