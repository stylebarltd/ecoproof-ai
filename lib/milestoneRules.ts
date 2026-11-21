// Pure milestone and rank rules (no server imports), shared by the NFT minting code, the metadata endpoint and client components.
// Milestones are POINT thresholds (see lib/stampClasses.ts): the five ranks, at 1, 10, 20, 35 and 50 points (Pola, 2026-11-20: spread out, one card about every 4 to 5
// points together with the board's spots in lib/journeyMap.ts; before that 1 / 5 / 10 / 25 / 50, and 1 / 3 / 10 / 25 / 50 until 2026-11-18).
// Every stamp writes a proof; only milestones mint. Cards minted under the older thresholds were renumbered by drizzle/0019 and 0021, so a rank is still read from its milestone.
export type RankKey = "sentinel" | "warden" | "guardian" | "vanguard" | "paragon";
export type Tier = { key: RankKey; name: string; tier: 1 | 2 | 3 | 4 | 5; at: number };

/** The five Bee Guardian ranks. Paragon is the summit: nothing more is minted by points after it (Paragon editions from the old rules, at 100, 150, ... points, stay where they are). */
export const RANKS: readonly Tier[] = [
  { key: "sentinel", name: "Sentinel", tier: 1, at: 1 },
  { key: "warden", name: "Warden", tier: 2, at: 10 },
  { key: "guardian", name: "Guardian", tier: 3, at: 20 },
  { key: "vanguard", name: "Vanguard", tier: 4, at: 35 },
  { key: "paragon", name: "Paragon", tier: 5, at: 50 },
];

/** The milestones a passport with `n` points has reached: the ranks' thresholds up to `n`. */
export const reachedMilestones = (n: number): number[] => RANKS.map((r) => r.at).filter((m) => m <= n);
/** The next rank's threshold, or the summit's once Paragon is reached (so `n >= nextMilestone(n)` means "top rank"). */
export const nextMilestone = (n: number): number => RANKS.find((r) => r.at > n)?.at ?? RANKS[RANKS.length - 1].at;

export function tierFor(milestone: number): Tier {
  return [...RANKS].reverse().find((r) => milestone >= r.at) ?? RANKS[0];
}
/** Only Paragon cards from the old rules have editions: 50 = edition 1, 100 = edition 2, .... Every other rank has one. */
export const editionOf = (milestone: number) => { const top = RANKS[RANKS.length - 1].at; return milestone >= top ? Math.floor((milestone - top) / 50) + 1 : 1; };
export const milestoneLabel = (m: number) => `${m} point${m === 1 ? "" : "s"}`;

/** Full-quality artwork (the NFT image) and 512px copies for pages and share images. All are static files in public/nft (scripts/nft-webp.ts). */
export const rankImage = (key: RankKey) => `/nft/${key}.png`;
export const rankWebp = (key: RankKey) => `/nft/web/${key}.webp`;
/** 512px PNG for share images: the og renderer cannot decode WebP. */
export const rankSharePng = (key: RankKey) => `/nft/web/${key}.png`;
/** The Metaplex Core collection every Bee Guardian belongs to (set once by scripts/nft-setup.ts). */
export const COLLECTION_NAME = "EcoProof Bee Guardians";
export const nftName = (t: Tier) => `${t.name} Bee Guardian · EcoProof`;
/** The name stored on-chain. Bubblegum allows 32 bytes and "·" is 2 bytes in UTF-8, which pushes three ranks to 33, so the chain gets a plain hyphen. */
export const onChainName = (t: Tier) => `${t.name} Bee Guardian - EcoProof`;
