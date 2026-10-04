// Two classes of stamp, one passport. Pure data (safe for client components).
//   verified purchase: a real WooCommerce order. We know the product line, so it carries the real impact. Premium.
//   presence:          a place QR (or a parcel card). Proves "I was here / I got this", nothing about a purchase. No impact number.
// Milestones count POINTS, not stamps. Change the ratio here, in one place (for example to 3 and 1).
export const POINTS_VERIFIED = 5;
export const POINTS_PRESENCE = 1;

export type StampClass = "verified" | "presence";

/** A stamp is a verified purchase only when it came through the order door. Everything else (QR, parcel card, older records) is presence. */
export const stampClass = (source: string | null | undefined): StampClass => (source === "order" ? "verified" : "presence");
export const pointsFor = (source: string | null | undefined): number => (stampClass(source) === "verified" ? POINTS_VERIFIED : POINTS_PRESENCE);
export const pointsLabel = (n: number) => `${n} point${n === 1 ? "" : "s"}`;
