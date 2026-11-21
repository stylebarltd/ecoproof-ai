// Two classes of stamp, one passport. Pure data (safe for client components).
//   verified purchase: a real WooCommerce order, or a receipt scanned in an eco shop (2026-11-15). We know the product lines, so it carries the real impact. Premium.
//   presence:          a place QR (or a parcel card). Proves "I was here / I got this", nothing about a purchase. No impact number.
// Milestones count POINTS, not stamps. Three values (Pola, 2026-11-20; before that a visit was 1 / 2 / 3 / 3 by kind of place):
//   a visit is 1, wherever it is: café, restaurant, hotel, an eco shop's till. A QR scan proves the same thing everywhere ("I was here"), and a place's QR
//     works once a day per person, so a three-day hotel stay is 3 scans and 3 points with no rule about "stays";
//   a parcel card is 3 (POINTS_CARD): the single-use card in a parcel, the door for orders through Amazon, Shopee or Lazada where no plugin can run. It proves
//     a parcel from that shop arrived, not what was in it;
//   a verified purchase is 5 (POINTS_VERIFIED): an online order, or a receipt photographed in the shop. A till scan and the receipt of the same visit both count (1 + 5).
// Points are always recomputed with today's table, so changing it needs no migration.
import type { PlaceKind } from "./placeKinds";

export const POINTS_VERIFIED = 5;
/** A visit, by kind of place: the same everywhere since 2026-11-20. Kept by kind so the pages that name a kind keep reading it here. */
export const POINTS_BY_KIND: Record<PlaceKind, number> = { cafe: 1, restaurant: 1, hotel: 1, eco_shop: 1 };
/** The base presence stamp (a visit); the lowest a stamp can be worth. */
export const POINTS_PRESENCE = POINTS_BY_KIND.cafe;
/** The card in a parcel (source "card"). */
export const POINTS_CARD = 3;

export type StampClass = "verified" | "presence";

/** A stamp is a verified purchase when it came through the order or the receipt door. Everything else (QR, parcel card, older records) is presence. */
export const stampClass = (source: string | null | undefined): StampClass => (source === "order" || source === "receipt" ? "verified" : "presence");
/** What a stamp counts toward milestones: a verified purchase POINTS_VERIFIED, a parcel card POINTS_CARD, any other presence stamp what a visit to that kind of place is worth. */
export const pointsFor = (source: string | null | undefined, kind?: string | null): number =>
  stampClass(source) === "verified" ? POINTS_VERIFIED : source === "card" ? POINTS_CARD : (POINTS_BY_KIND[kind as PlaceKind] ?? POINTS_PRESENCE);
export const pointsLabel = (n: number) => `${n} point${n === 1 ? "" : "s"}`;
