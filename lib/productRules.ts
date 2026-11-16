// The eco product standard's fixed lists (docs/eco-product-standard.md). Shared by the browser and the server, and by the database's
// check constraints (lib/schema.ts): a change here needs a migration.

/** What a shop can sell plastic-free. */
export const PRODUCT_CATEGORIES = ["food_glass_paper_metal", "bulk_refill", "soap_cosmetics", "reusables", "household"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** How the product is packed. "none" is bare, "refill" goes into the customer's own container. Plastic is not on the list: it isn't eco. */
export const PACKAGING_TYPES = ["glass", "paper", "metal", "none", "refill"] as const;
export type PackagingType = (typeof PACKAGING_TYPES)[number];

/** Who told us about the product: the shop, a customer's photo of an unknown receipt line, or an online order. */
export const PRODUCT_SOURCES = ["owner", "customer_photo", "order_webhook"] as const;
export type ProductSource = (typeof PRODUCT_SOURCES)[number];

/** declared: the shop or a customer says so. confirmed: the owner confirmed a customer's find. reported: one confirmed "Not true"
 *  report. removed: two confirmed reports; it no longer matches receipt lines. */
export const PRODUCT_STATUSES = ["declared", "confirmed", "reported", "removed"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/** Confirmed reports that take a product off the eco list. */
export const REPORTS_TO_REMOVE = 2;
