// Two classes of stamp, one passport. Pure data (safe for client components).
//   verified purchase: a real WooCommerce order, or a receipt scanned in an eco shop (2026-11-15). We know the product lines, so it carries the real impact. Premium.
//   presence:          a place QR (or a parcel card). Proves "I was here / I got this", nothing about a purchase. No impact number.
// Milestones count POINTS, not stamps. A presence stamp is worth what the kind of place says (Pola, 21 Oct 2026): a café or restaurant
// visit 1, a hotel stay 2, a QR at an eco store's till 1. An eco store purchase earns POINTS_VERIFIED only when it is verified: an online
// order, or a successful receipt scan in the shop. Points are always
// recomputed with today's table, so changing it needs no migration.
import type { PlaceKind } from "./placeKinds";

export const POINTS_VERIFIED = 5;
export const POINTS_BY_KIND: Record<PlaceKind, number> = { cafe: 1, restaurant: 1, hotel: 2, eco_shop: 1 };
/** The base presence stamp (a café visit); the lowest a stamp can be worth. */
export const POINTS_PRESENCE = POINTS_BY_KIND.cafe;

export type StampClass = "verified" | "presence";

/** A stamp is a verified purchase when it came through the order or the receipt door. Everything else (QR, parcel card, older records) is presence. */
export const stampClass = (source: string | null | undefined): StampClass => (source === "order" || source === "receipt" ? "verified" : "presence");
/** What a stamp counts toward milestones: a verified purchase is always POINTS_VERIFIED; presence depends on the kind of place. */
export const pointsFor = (source: string | null | undefined, kind?: string | null): number =>
  stampClass(source) === "verified" ? POINTS_VERIFIED : (POINTS_BY_KIND[kind as PlaceKind] ?? POINTS_PRESENCE);
export const pointsLabel = (n: number) => `${n} point${n === 1 ? "" : "s"}`;
