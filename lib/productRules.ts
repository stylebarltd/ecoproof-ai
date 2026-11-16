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

export const CATEGORY_LABELS: Record<ProductCategory, { label: string; examples: string }> = {
  food_glass_paper_metal: { label: "Food in glass, paper or metal", examples: "jars, tins, paper packs" },
  bulk_refill: { label: "Bulk and refill", examples: "dry goods, liquids, cleaning products" },
  soap_cosmetics: { label: "Soap and cosmetics as bars or refills", examples: "soap, shampoo bars, toothpaste tabs" },
  reusables: { label: "Reusables", examples: "wraps, bottles, cups, cutlery, bags" },
  household: { label: "Household", examples: "brushes, cloths, sponges, loofahs" },
};
export const PACKAGING_LABELS: Record<PackagingType, string> = { glass: "Glass", paper: "Paper", metal: "Metal", none: "No packaging", refill: "Refill, customer's own container" };

export const isCategory = (v: unknown): v is ProductCategory => (PRODUCT_CATEGORIES as readonly unknown[]).includes(v);
export const isPackaging = (v: unknown): v is PackagingType => (PACKAGING_TYPES as readonly unknown[]).includes(v);

export const PRODUCT_NAME_MAX = 120;
export const MAX_PRODUCTS = 300;
export const MAX_ALIASES = 10;

export type Product = {
  id: string; receiptName: string; displayName: string; category: ProductCategory; packagingType: PackagingType;
  replaces: string | null; photoUrl: string | null; source: ProductSource; status: ProductStatus;
  /** Other names the same product is printed with (another language, the till's short name, an old name). */
  aliases: string[];
};
export type ProductSetupState = {
  role: "owner" | "staff";
  /** categories ticked, refill answered (null = not yet), the declaration's date, and whether a sample receipt is stored */
  setup: { categories: ProductCategory[]; refill: boolean | null; declaredAt: string | null; hasSample: boolean; inStore: boolean };
  products: Product[];
  /** The "category/packaging" pairs EcoProof AI has an impact figure for; a product outside them is listed but counts nothing yet. */
  counted: string[];
  /** receipt lines customers scanned that match no product yet */
  queue: { rawText: string; times: number; lastSeen: string; photoUrl: string | null }[];
};

/** What a customer can say about a listed product ("Not true"). */
export const PRODUCT_REPORT_REASONS = [
  { id: "plastic_packaging", label: "It is sold in plastic packaging" },
  { id: "not_sold", label: "This shop doesn't sell it" },
  { id: "other", label: "Something else" },
] as const;
export const isProductReason = (r: string) => PRODUCT_REPORT_REASONS.some((x) => x.id === r);
