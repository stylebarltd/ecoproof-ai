// Transparent, hand-built emission-factor table (per unit). Estimates, not audited LCA data.
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
  compostable_packaging: { co2Kg: 0.15, plasticItems: 1, packagingG: 25, label: "Compostable packaging" },
  secondhand_clothing: { co2Kg: 8.0, plasticItems: 0, packagingG: 0, label: "Second-hand clothing" },
  plant_based_food: { co2Kg: 1.5, plasticItems: 0, packagingG: 0, label: "Plant-based food" },
  bulk_zero_waste: { co2Kg: 0.2, plasticItems: 1, packagingG: 30, label: "Bulk / zero-waste" },
  led_energy_saving: { co2Kg: 2.0, plasticItems: 0, packagingG: 0, label: "Energy-saving product" },
  not_sustainable: { co2Kg: 0, plasticItems: 0, packagingG: 0, label: "Standard item" },
};

export type LineItem = { name: string; quantity: number; category: Category; confidence: number };
export type Impact = { co2Kg: number; plasticItems: number; packagingG: number; sustainableItems: number };

export function computeImpact(items: LineItem[]): Impact {
  const t: Impact = { co2Kg: 0, plasticItems: 0, packagingG: 0, sustainableItems: 0 };
  for (const it of items) {
    const f = FACTORS[it.category];
    if (!f || it.category === "not_sustainable") continue;
    const q = Math.max(1, Math.round(it.quantity));
    t.co2Kg += f.co2Kg * q;
    t.plasticItems += f.plasticItems * q;
    t.packagingG += f.packagingG * q;
    t.sustainableItems += q;
  }
  t.co2Kg = Math.round(t.co2Kg * 100) / 100;
  return t;
}
