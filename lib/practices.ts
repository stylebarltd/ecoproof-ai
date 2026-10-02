// Shared by server and client code. Must not import anything server-only (db, solana).
export const PRACTICES = {
  no_styrofoam: { label: "No styrofoam takeaway", icon: "📦" },
  no_plastic_straws: { label: "No plastic straws", icon: "🥤" },
  no_plastic_cups: { label: "No plastic cups", icon: "☕" },
  plastic_free_products: { label: "Sells plastic-free products", icon: "🛍️" },
  byo_discount: { label: "Discount if you bring your own cup/container", icon: "🏷️" },
} as const;
export type PracticeId = keyof typeof PRACTICES;
export const PRACTICE_IDS = Object.keys(PRACTICES) as PracticeId[];

/** Distinct verified-receipt confirmations needed before a pledge earns its badge. Demo shops need 1 so the demo is quick. */
export const needed = (demo: boolean) => (demo ? 1 : 3);

export type PracticeStatus = { id: PracticeId; pledged: boolean; detail: string | null; ownerConfirmed: boolean; confirmations: number; needed: number; verified: boolean };
export type PlaceSummary = {
  id: string; name: string; type: string; lat: number; lng: number; demo: boolean; ownerVerified: boolean;
  practices: PracticeStatus[]; reviews: number; avgStars: number | null; verifiedCount: number; pledgedCount: number;
};

