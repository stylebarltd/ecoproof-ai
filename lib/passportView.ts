import type { Nft } from "./milestones";
import { reachedMilestones, tierFor } from "./milestoneRules";

/** Highest tier first (then newest), so the hero can show the best NFT largest. */
export const rankNfts = (nfts: Nft[]) => [...nfts].sort((a, b) => b.milestone - a.milestone);

export const explorerAsset = (assetId: string) => `https://explorer.solana.com/address/${assetId}?cluster=devnet`;
export const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

/** "7 stamps, 3 to Guardian" plus the 0..1 position between the last milestone reached and the next one. */
export function progress(stamps: number, next: number) {
  const prev = reachedMilestones(stamps).at(-1) ?? 0;
  const span = Math.max(1, next - prev);
  return {
    toGo: next - stamps,
    nextTier: tierFor(next).name,
    fraction: Math.min(1, Math.max(0, (stamps - prev) / span)),
    text: `${stamps} stamp${stamps === 1 ? "" : "s"}, ${next - stamps} to ${tierFor(next).name}`,
  };
}
