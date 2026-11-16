// The eco product standard's fixed lists (docs/eco-product-standard.md). Shared by the browser and the server, and by the database's
// check constraints (lib/schema.ts): a change here needs a migration.

/** What a shop can sell plastic-free. */
export const PRODUCT_CATEGORIES = ["food_glass_paper_metal", "bulk_refill", "soap_cosmetics", "reusables", "household"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** How the product is packed. "none" is bare, "refill" goes into the customer's own container. Plastic is not on the list: it isn't eco. */
export const PACKAGING_TYPES = ["glass", "paper", "metal", "none", "refill"] as const;
export type PackagingType = (typeof PACKAGING_TYPES)[number];

/**
 * What kind of product it is: the rows of the standard's impact table (section 5). The impact figure belongs to the type, never to the
 * shop or the product. "other" is anything the table has no row for yet: it can be listed, and counts nothing.
 */
export const PRODUCT_TYPES = [
  "reusable_wrap", "reusable_container", "reusable_cutlery_straw", "reusable_bag", "produce_bag", "reusable_cloth",
  "soap_bar", "toothpaste_tabs", "toothpaste_tabs_travel", "plastic_free_floss", "bamboo_toothbrush",
  "laundry_pouch", "dryer_balls", "natural_sponge",
  "refill", "glass_pack", "paper_metal_pack", "other",
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

/** A pack can hold several of the same thing (a set of 3 wraps): each piece counts. */
export const MAX_PIECES = 100;

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

export const TYPE_LABELS: Record<ProductType, { label: string; examples: string }> = {
  reusable_wrap: { label: "Reusable wrap", examples: "beeswax wrap, wax bag" },
  reusable_container: { label: "Reusable container", examples: "bottle, cup, lunchbox" },
  reusable_cutlery_straw: { label: "Reusable cutlery or straw", examples: "steel or bamboo set" },
  reusable_bag: { label: "Reusable shopping bag", examples: "tote, cloth bag" },
  produce_bag: { label: "Reusable produce bag", examples: "mesh bag for fruit and vegetables" },
  reusable_cloth: { label: "Reusable kitchen cloth", examples: "washable cotton cloth used instead of throwaway dishcloths, each" },
  soap_bar: { label: "Soap or shampoo bar", examples: "bar, solid conditioner" },
  toothpaste_tabs: { label: "Toothpaste tabs", examples: "jar or box of about 100 tabs or more" },
  toothpaste_tabs_travel: { label: "Toothpaste tabs, travel size", examples: "small tin, about two weeks of tabs" },
  plastic_free_floss: { label: "Plastic-free dental floss", examples: "floss in glass or paper, per spool" },
  bamboo_toothbrush: { label: "Bamboo toothbrush", examples: "toothbrush" },
  laundry_pouch: { label: "Reusable laundry pouch", examples: "washes about 300 loads without detergent" },
  dryer_balls: { label: "Wool dryer balls", examples: "a set, used instead of dryer sheets" },
  natural_sponge: { label: "Natural sponge or luffa", examples: "luffa dish scrubber" },
  refill: { label: "Refill into the customer's own container", examples: "dry goods, liquids, cleaning products" },
  glass_pack: { label: "In glass instead of plastic", examples: "jars, bottles" },
  paper_metal_pack: { label: "In paper or metal instead of plastic", examples: "packs, tins" },
  other: { label: "Something else", examples: "no impact figure yet" },
};

/** The types a category offers. A category with one type needs no question; food's type follows from its packaging (typeOf). */
export const TYPES_BY_CATEGORY: Record<ProductCategory, readonly ProductType[]> = {
  food_glass_paper_metal: ["glass_pack", "paper_metal_pack", "refill", "other"],
  bulk_refill: ["refill"],
  soap_cosmetics: ["soap_bar", "toothpaste_tabs", "toothpaste_tabs_travel", "plastic_free_floss", "refill", "glass_pack", "paper_metal_pack", "other"],
  reusables: ["reusable_wrap", "reusable_container", "reusable_cutlery_straw", "reusable_bag", "produce_bag", "reusable_cloth", "other"],
  household: ["bamboo_toothbrush", "natural_sponge", "laundry_pouch", "dryer_balls", "other"],
};
/** Categories where the owner picks the type; in the others it follows from the category and the packaging. */
export const asksType = (c: ProductCategory) => c === "soap_cosmetics" || c === "reusables" || c === "household";

/** The product's type: the one the owner picked where the category asks, else what category and packaging say. Null when the pick
 *  doesn't belong to the category. */
export function typeOf(category: ProductCategory, packaging: PackagingType, picked: unknown): ProductType | null {
  if (asksType(category)) return isType(picked) && TYPES_BY_CATEGORY[category].includes(picked) ? picked : null;
  if (category === "bulk_refill" || packaging === "refill") return "refill";
  return packaging === "glass" ? "glass_pack" : packaging === "paper" || packaging === "metal" ? "paper_metal_pack" : "other";
}

/** The category a type is listed under: where a product goes when only its kind is known (a list import, the plugin's catalogue). */
export const categoryOfType = (t: ProductType): ProductCategory =>
  PRODUCT_CATEGORIES.find((c) => asksType(c) && TYPES_BY_CATEGORY[c].includes(t)) ?? (t === "refill" ? "bulk_refill" : "food_glass_paper_metal");

export const isType = (v: unknown): v is ProductType => (PRODUCT_TYPES as readonly unknown[]).includes(v);
export const isCategory = (v: unknown): v is ProductCategory => (PRODUCT_CATEGORIES as readonly unknown[]).includes(v);
export const isPackaging = (v: unknown): v is PackagingType => (PACKAGING_TYPES as readonly unknown[]).includes(v);

export const PRODUCT_NAME_MAX = 120;
export const MAX_PRODUCTS = 300;
export const MAX_ALIASES = 10;
export const MAX_PARTS = 20;

export type Product = {
  id: string; receiptName: string; displayName: string; category: ProductCategory; packagingType: PackagingType;
  productType: ProductType; /** how many of the thing are in the pack */ pieces: number;
  replaces: string | null; photoUrl: string | null; source: ProductSource; status: ProductStatus;
  /** Other names the same product is printed with (another language, the till's short name, an old name). */
  aliases: string[];
  /** A bundle's contents: other products on the list, and how many of each. A bundle counts as the sum of its parts. */
  parts: { id: string; name: string; count: number }[];
};
export type ProductSetupState = {
  role: "owner" | "staff";
  /** categories ticked, refill answered (null = not yet), the declaration's date, and whether a sample receipt is stored */
  setup: { categories: ProductCategory[]; refill: boolean | null; declaredAt: string | null; hasSample: boolean; inStore: boolean };
  products: Product[];
  /** EcoProof AI's impact figure per product type, in grams per piece; a type without one is listed but counts nothing yet. */
  factors: Partial<Record<ProductType, { plasticG: number; co2G: number }>>;
  /** products the shop's plugin sent, with the AI's proposal, waiting for the owner (type null = it doesn't look plastic-free) */
  catalogue: { id: number; key: string; name: string; type: ProductType | null; pieces: number }[];
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
