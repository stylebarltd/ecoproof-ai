import type { PackagingType, ProductCategory } from "./productRules";

// What a purchase is worth: grams of plastic and of CO2 avoided (docs/eco-product-standard.md). Every line's numbers come from
// impact_factors by the product's category and packaging (lib/order.ts); nobody sets them per product.

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
