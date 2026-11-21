import type { Nft } from "./milestones";
import { reachedMilestones, tierFor } from "./milestoneRules.ts";

/** Highest tier first (then newest), so the hero can show the best NFT largest. */
export const rankNfts = (nfts: Nft[]) => [...nfts].sort((a, b) => b.milestone - a.milestone);

export const explorerAsset = (assetId: string) => `https://explorer.solana.com/address/${assetId}?cluster=devnet`;
export const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

/** "12 points · 13 to Vanguard" plus the 0..1 position between the last milestone reached and the next one. */
export function progress(points: number, next: number) {
  const prev = reachedMilestones(points).at(-1) ?? 0;
  const span = Math.max(1, next - prev);
  if (points >= next) return { toGo: 0, nextTier: tierFor(next).name, fraction: 1, text: `${points} point${points === 1 ? "" : "s"} · ${tierFor(next).name} reached` }; // the summit: nothing further by points
  const nextTier = tierFor(next).name;
  return {
    toGo: next - points,
    nextTier,
    fraction: Math.min(1, Math.max(0, (points - prev) / span)),
    text: `${points} point${points === 1 ? "" : "s"} · ${next - points} to ${nextTier}`,
  };
}

/**
 * Where a Bee Guardian is on its way to the wallet. "waiting": no wallet yet, so it waits in the database to be claimed.
 * "queued": a wallet is there and the mint starts shortly. "retrying": the last mint failed; it is tried again on the next stamp or "Try again".
 */
export type NftState = "waiting" | "queued" | "minting" | "retrying" | "onchain";
export function nftState(n: Pick<Nft, "status" | "assetId" | "error">, hasWallet: boolean): NftState {
  if (n.status === "minted" && n.assetId) return "onchain";
  if (n.status === "minting") return "minting";
  if (!hasWallet) return "waiting";
  return n.error ? "retrying" : "queued";
}
export const NFT_STATE_LABEL: Record<NftState, string> = { waiting: "Waiting to claim", queued: "Minting soon", minting: "Minting on Solana", retrying: "Mint failed, retrying", onchain: "On Solana" };
