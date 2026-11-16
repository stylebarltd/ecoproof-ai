import type { PackagingType, ProductCategory } from "./productRules";

// What a purchase is worth: grams of plastic and of CO2 avoided (docs/eco-product-standard.md). Every line's numbers come from
// impact_factors by the product's category and packaging (lib/order.ts); nobody sets them per product.

// ---- Retired ----------------------------------------------------------------------------------------------------------------------
// The first engine's categories, factors and "replaces" wording. Nothing is counted with them any more; only lib/productImpact.ts and
// the SuperBee catalogue (the WooCommerce plugin's product screen) still read them, until that screen is retired too.
export const CATEGORIES = [
  "reusable_bottle",
  "reusable_bag",
  "reusable_cup",
  "reusable_straw_cutlery",
  "reusable_household_textile",
  "refill_cleaning",
  "plastic_free_laundry",
  "solid_personal_care",
  "beeswax_wrap",
  "compostable_packaging",
  "natural_cleaning_tool",
  "plastic_free_oral_care",
  "secondhand_clothing",
  "plant_based_food",
  "bulk_zero_waste",
  "led_energy_saving",
  "not_sustainable",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Factor = { co2Kg: number; plasticItems: number; packagingG: number; label: string };

export const FACTORS: Record<Category, Factor> = {
  reusable_bottle: { co2Kg: 1.0, plasticItems: 150, packagingG: 0, label: "Reusable bottle" },
  reusable_bag: { co2Kg: 1.2, plasticItems: 100, packagingG: 0, label: "Reusable bag" },
  reusable_cup: { co2Kg: 3.0, plasticItems: 200, packagingG: 0, label: "Reusable cup" },
  reusable_straw_cutlery: { co2Kg: 0.5, plasticItems: 100, packagingG: 0, label: "Reusable straw / cutlery" },
  // Washable towels / napkins that replace disposable paper products (rolls, packaging, trees).
  reusable_household_textile: { co2Kg: 0.8, plasticItems: 0, packagingG: 80, label: "Reusable towels / napkins" },
  refill_cleaning: { co2Kg: 0.4, plasticItems: 1, packagingG: 60, label: "Refill cleaning product" },
  // One pouch ≈ 300 loads, replacing ~7 plastic detergent jugs (~90 g HDPE each) and the water shipped inside them.
  plastic_free_laundry: { co2Kg: 3.0, plasticItems: 7, packagingG: 600, label: "Plastic-free laundry (300 loads)" },
  solid_personal_care: { co2Kg: 0.3, plasticItems: 1, packagingG: 40, label: "Solid personal care" },
  beeswax_wrap: { co2Kg: 0.6, plasticItems: 50, packagingG: 0, label: "Beeswax wrap" },
  natural_cleaning_tool: { co2Kg: 0.4, plasticItems: 6, packagingG: 60, label: "Natural cleaning tool (loofah / dryer balls)" },
  plastic_free_oral_care: { co2Kg: 0.15, plasticItems: 1, packagingG: 20, label: "Plastic-free oral care" },
  compostable_packaging: { co2Kg: 0.15, plasticItems: 1, packagingG: 25, label: "Compostable packaging" },
  secondhand_clothing: { co2Kg: 8.0, plasticItems: 0, packagingG: 0, label: "Second-hand clothing" },
  plant_based_food: { co2Kg: 1.5, plasticItems: 0, packagingG: 0, label: "Plant-based food" },
  bulk_zero_waste: { co2Kg: 0.2, plasticItems: 1, packagingG: 30, label: "Bulk / zero-waste" },
  led_energy_saving: { co2Kg: 2.0, plasticItems: 0, packagingG: 0, label: "Energy-saving product" },
  not_sustainable: { co2Kg: 0, plasticItems: 0, packagingG: 0, label: "Standard item" },
};

/** One kind of single-use item a product replaces, per unit bought: "7 plastic detergent jugs". */
export type Replaces = { count: number; one: string; many: string };

// ---- Current ----------------------------------------------------------------------------------------------------------------------

/**
 * One line of an order or a receipt. `category` and `packagingType` say which factor it got; `plasticG` and `co2G` are that factor, per
 * unit. "not_sustainable" is a line that counts nothing. `impactSource`: "shop" when the line is a product the shop declared, "ai" when
 * EcoProof AI estimated category and packaging from the name because the shop hasn't listed it yet.
 */
export type LineItem = {
  name: string; quantity: number; category: ProductCategory | "not_sustainable"; packagingType?: PackagingType;
  plasticG: number; co2G: number; confidence: number;
  productId?: string; // products.id when it matched one
  impactSource?: "shop" | "ai";
};

/** A purchase's totals as records keep them: `packagingG` is the grams of plastic avoided, `co2Kg` the CO2 avoided. `plasticItems`
 *  (a count of single-use items, the first engine's headline) is always 0 now; the column stays because it is part of every proof. */
export type Impact = { co2Kg: number; plasticItems: number; packagingG: number; sustainableItems: number };

export function computeImpact(items: LineItem[]): Impact {
  let plasticG = 0, co2G = 0, sustainableItems = 0;
  for (const it of items) {
    if (it.category === "not_sustainable" || !(it.plasticG > 0 || it.co2G > 0)) continue;
    const q = Math.max(1, Math.round(it.quantity));
    plasticG += it.plasticG * q; co2G += it.co2G * q; sustainableItems += q;
  }
  return { co2Kg: Math.round(co2G) / 1000, plasticItems: 0, packagingG: Math.round(plasticG), sustainableItems };
}

/** A weight in words: "90 g", "1.5 kg", "12 kg". */
export function grams(g: number): string {
  if (g < 1000) return `${Math.round(g)} g`;
  const kg = g / 1000;
  return `${kg < 10 ? Math.round(kg * 10) / 10 : Math.round(kg)} kg`;
}

/** An impact in words, the one wording everywhere: ["150 g plastic avoided", "450 g CO₂ saved"]. Empty when there is none. */
export function impactParts(i: { plasticG: number; co2Kg: number }): string[] {
  const parts: string[] = [];
  if (i.plasticG > 0) parts.push(`${grams(i.plasticG)} plastic avoided`);
  if (i.co2Kg > 0) parts.push(`${grams(i.co2Kg * 1000)} CO₂ saved`);
  return parts;
}
