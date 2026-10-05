// Pure milestone and rank rules (no server imports), shared by the NFT minting code, the metadata endpoint and client components.
// Milestones are POINT thresholds (see lib/stampClasses.ts): 1, 3, 10, 25, 50, then every further 50. Every stamp writes a proof; only milestones mint.
export const BASE_MILESTONES = [1, 3, 10, 25] as const;
export const reachedMilestones = (n: number): number[] => [...BASE_MILESTONES.filter((m) => m <= n), ...Array.from({ length: Math.floor(n / 50) }, (_, i) => (i + 1) * 50)];
export const nextMilestone = (n: number): number => BASE_MILESTONES.find((m) => m > n) ?? (Math.floor(n / 50) + 1) * 50;

export type RankKey = "sentinel" | "warden" | "guardian" | "vanguard" | "paragon";
export type Tier = { key: RankKey; name: string; tier: 1 | 2 | 3 | 4 | 5; at: number };

/** The five Bee Guardian ranks. Paragon is reached at 50 points, and every further 50 points mints another Paragon edition. */
export const RANKS: readonly Tier[] = [
  { key: "sentinel", name: "Sentinel", tier: 1, at: 1 },
  { key: "warden", name: "Warden", tier: 2, at: 3 },
  { key: "guardian", name: "Guardian", tier: 3, at: 10 },
  { key: "vanguard", name: "Vanguard", tier: 4, at: 25 },
  { key: "paragon", name: "Paragon", tier: 5, at: 50 },
];

export function tierFor(milestone: number): Tier {
  return [...RANKS].reverse().find((r) => milestone >= r.at) ?? RANKS[0];
}
/** Paragon editions count up every 50 points (50 = edition 1, 100 = edition 2, ...). Other ranks have a single edition. */
export const editionOf = (milestone: number) => (milestone >= 50 ? Math.floor(milestone / 50) : 1);
export const milestoneLabel = (m: number) => `${m} point${m === 1 ? "" : "s"}`;

/** Full-quality artwork (the NFT image) and 512px copies for pages and share images. All are static files in public/nft (scripts/nft-webp.ts). */
export const rankImage = (key: RankKey) => `/nft/${key}.png`;
export const rankWebp = (key: RankKey) => `/nft/web/${key}.webp`;
/** 512px PNG for share images: the og renderer cannot decode WebP. */
export const rankSharePng = (key: RankKey) => `/nft/web/${key}.png`;
export const nftName = (t: Tier) => `${t.name} Bee Guardian · EcoProof`;
/** The name stored on-chain. Bubblegum allows 32 bytes and "·" is 2 bytes in UTF-8, which pushes three ranks to 33, so the chain gets a plain hyphen. */
export const onChainName = (t: Tier) => `${t.name} Bee Guardian - EcoProof`;
