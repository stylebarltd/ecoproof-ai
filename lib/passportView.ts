import type { Nft } from "./milestones";
import { reachedMilestones, tierFor } from "./milestoneRules";

/** Highest tier first (then newest), so the hero can show the best NFT largest. */
export const rankNfts = (nfts: Nft[]) => [...nfts].sort((a, b) => b.milestone - a.milestone);

export const explorerAsset = (assetId: string) => `https://explorer.solana.com/address/${assetId}?cluster=devnet`;
export const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

/** "7 points, 3 to Guardian" plus the 0..1 position between the last milestone reached and the next one. */
export function progress(points: number, next: number) {
  const prev = reachedMilestones(points).at(-1) ?? 0;
  const span = Math.max(1, next - prev);
  return {
    toGo: next - points,
    nextTier: tierFor(next).name,
    fraction: Math.min(1, Math.max(0, (points - prev) / span)),
    text: `${points} point${points === 1 ? "" : "s"}, ${next - points} to ${tierFor(next).name}`,
  };
}
