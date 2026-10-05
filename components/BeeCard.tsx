"use client";
import { useState } from "react";
import { rankWebp, type Tier } from "@/lib/milestoneRules";
import { explorerAsset } from "@/lib/passportView";
import type { Nft } from "@/lib/milestones";

/**
 * A Bee Guardian as a collectible card: dark glass panel inside a gold/holographic edge.
 * Earned: the artwork, rank, tier, serial (and Paragon edition), and a Solana link once minted.
 * Locked: a dimmed silhouette of the artwork and the points it unlocks at.
 */
/** `impact`: the owner's verified-purchase totals, shown on the big card once there are any. */
export default function BeeCard({ rank, nft, big, wallet, impact }: { rank: Tier; nft?: Nft; big?: boolean; wallet?: boolean; impact?: { plasticItems: number; co2Kg: number } }) {
  const [broken, setBroken] = useState(false);
  const locked = !nft;
  const minted = nft?.status === "minted" && nft.assetId;
  const serial = nft?.serial ? `#${String(nft.serial).padStart(4, "0")}` : null;

  const card = (
    <div className={`bee-edge rounded-[22px] p-[2px] ${locked ? "opacity-80 saturate-0" : big ? "bee-edge-glow" : ""}`}>
      <div className={`relative overflow-hidden rounded-[20px] bg-[linear-gradient(160deg,rgba(29,36,22,0.94),rgba(44,54,31,0.9)_55%,rgba(20,24,14,0.96))] text-[#f6f1e4] ${big ? "p-3.5" : "p-2"}`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(247,210,122,0.28),transparent_62%)]" aria-hidden />
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#f7d27a]">
          <span>Tier {rank.tier}</span>
          {!locked && <span className="font-mono normal-case tracking-normal text-[#dcebc4]">{nft!.rank === "paragon" ? `Ed. ${nft!.edition} · ` : ""}{serial}</span>}
        </div>
        <div className="relative mx-auto aspect-square w-full">
          {broken ? (
            <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl ring-1 ring-[#e8a317]/60">
              <span className={`font-heading text-[#f7d27a] ${big ? "text-2xl" : "text-sm"}`}>{rank.name}</span>
              <span className="text-[10px] text-[#dcebc4]">Bee Guardian</span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={rankWebp(rank.key)} alt={locked ? `${rank.name}, locked` : `${rank.name} Bee Guardian`} width={512} height={512} loading={big ? "eager" : "lazy"}
              onError={() => setBroken(true)}
              className={`h-full w-full object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.45)] ${locked ? "opacity-35 brightness-0" : ""}`}
            />
          )}
        </div>
        <div className="relative text-center leading-tight">
          <div className={`font-heading ${big ? "text-xl" : "text-[13px]"}`}>{rank.name}</div>
          {big && !locked && impact && (impact.plasticItems > 0 || impact.co2Kg > 0) && (
            <div className="my-1.5 flex justify-center gap-1.5 text-[11px] font-semibold">
              {impact.plasticItems > 0 && <span className="rounded-full bg-white/10 px-2 py-0.5 ring-1 ring-white/20">{impact.plasticItems} plastic{impact.plasticItems === 1 ? "" : "s"} avoided</span>}
              {impact.co2Kg > 0 && <span className="rounded-full bg-white/10 px-2 py-0.5 ring-1 ring-white/20">{impact.co2Kg.toFixed(1)} kg CO₂ saved</span>}
            </div>
          )}
          {locked ? (
            <div className={`${big ? "text-xs" : "text-[10px]"} font-semibold text-[#dcebc4]`}>Unlocks at {rank.at} point{rank.at === 1 ? "" : "s"}</div>
          ) : minted ? (
            <div className={`${big ? "text-xs" : "text-[10px]"} font-bold text-[#f7d27a]`}>{big ? "Soulbound · view on Solana ↗" : "View on Solana ↗"}</div>
          ) : (
            <div className={`${big ? "text-xs" : "text-[10px]"} font-bold text-[#f7d27a]`}>{big ? "Soulbound · " : ""}{wallet ? "minting…" : big ? "connect a wallet to claim" : "Connect wallet"}</div>
          )}
        </div>
      </div>
    </div>
  );
  return minted ? <a href={explorerAsset(nft!.assetId!)} target="_blank" rel="noreferrer" className="block">{card}</a> : card;
}
