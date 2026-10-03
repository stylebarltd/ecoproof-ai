// Pure milestone and tier rules (no server imports), shared by the NFT minting code, the artwork and client components.
// Milestones are stamp counts: 1, 3, 10, 25, then every 50. Every stamp writes a proof; only milestones mint.
export const BASE_MILESTONES = [1, 3, 10, 25] as const;
export const reachedMilestones = (n: number): number[] => [...BASE_MILESTONES.filter((m) => m <= n), ...Array.from({ length: Math.floor(n / 50) }, (_, i) => (i + 1) * 50)];
export const nextMilestone = (n: number): number => BASE_MILESTONES.find((m) => m > n) ?? (Math.floor(n / 50) + 1) * 50;

export type Tier = { key: "seedling" | "sprout" | "guardian" | "legend"; name: string };
/** Four tiers that visibly level up; every milestone from 25 on is a Legend (its artwork scales with the count). */
export function tierFor(milestone: number): Tier {
  if (milestone >= 25) return { key: "legend", name: "Legend" };
  if (milestone >= 10) return { key: "guardian", name: "Guardian" };
  if (milestone >= 3) return { key: "sprout", name: "Sprout" };
  return { key: "seedling", name: "Seedling" };
}
export const milestoneLabel = (m: number) => (m === 1 ? "First stamp" : `${m} stamps`);

