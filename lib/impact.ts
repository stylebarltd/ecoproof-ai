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

/**
 * One order line. Products with their own impact (lib/productImpact.ts: estimated by AI, confirmed by the shop) carry what one
 * unit replaces and its CO2; everything else falls back to the category's factor.
 */
export type LineItem = {
  name: string; quantity: number; category: Category; confidence: number;
  productId?: number;
  replaces?: Replaces[]; co2PerUnit?: number;
  impactSource?: "shop" | "ai"; // who set the product's numbers: confirmed by the shop, or an AI estimate not yet confirmed
};
export type Impact = { co2Kg: number; plasticItems: number; packagingG: number; sustainableItems: number };

export function computeImpact(items: LineItem[]): Impact {
  const t: Impact = { co2Kg: 0, plasticItems: 0, packagingG: 0, sustainableItems: 0 };
  for (const it of items) {
    const f = FACTORS[it.category];
    if (!f || it.category === "not_sustainable") continue;
    const q = Math.max(1, Math.round(it.quantity));
    t.co2Kg += (it.replaces ? it.co2PerUnit ?? 0 : f.co2Kg) * q;
    t.plasticItems += (it.replaces ? it.replaces.reduce((n, r) => n + r.count, 0) : f.plasticItems) * q;
    t.packagingG += f.packagingG * q;
    t.sustainableItems += q;
  }
  t.co2Kg = Math.round(t.co2Kg * 100) / 100;
  return t;
}

/** The one wording for plastics everywhere: "1 single-use plastic avoided", "2 single-use plastics avoided". */
export const plasticsAvoided = (n: number) => `${n} single-use plastic${n === 1 ? "" : "s"} avoided`;

const GENERIC: Omit<Replaces, "count"> = { one: "single-use plastic", many: "single-use plastics" };

/** What a set of order lines replaces, added up per kind of item, biggest first. Lines without their own numbers count as generic single-use plastics. */
export function replacesSummary(items: LineItem[]): Replaces[] {
  const by = new Map<string, Replaces>();
  const add = (r: Omit<Replaces, "count">, n: number) => {
    if (n <= 0) return;
    const cur = by.get(r.many) ?? { ...r, count: 0 };
    cur.count += n;
    by.set(r.many, cur);
  };
  for (const it of items) {
    if (it.category === "not_sustainable") continue;
    const q = Math.max(1, Math.round(it.quantity));
    if (it.replaces) for (const r of it.replaces) add(r, r.count * q);
    else add(GENERIC, (FACTORS[it.category]?.plasticItems ?? 0) * q);
  }
  return [...by.values()].sort((a, b) => b.count - a.count);
}

const count = (r: Replaces) => `${r.count} ${r.count === 1 ? r.one : r.many}`;

/** "7 plastic detergent jugs and 50 sheets of plastic cling film" (the biggest kinds, "and more" beyond `max`), or "" when nothing is replaced. */
export function replacesText(list: Replaces[], max = 2): string {
  if (!list.length) return "";
  const shown = list.slice(0, max).map(count);
  if (list.length > max) return `${shown.join(", ")} and more`;
  return shown.length > 1 ? `${shown.slice(0, -1).join(", ")} and ${shown.at(-1)}` : shown[0];
}

/** A person's or order's impact in words: "Replaced about 7 plastic detergent jugs and 300 disposable dryer sheets" (or the generic plastics line), plus CO2. */
export function impactParts(i: { plasticItems: number; co2Kg: number; replaces?: Replaces[] }, maxKinds = 2): string[] {
  const parts: string[] = [];
  const replaced = replacesText(i.replaces ?? [], maxKinds);
  if (replaced) parts.push(`Replaced about ${replaced}`);
  else if (i.plasticItems > 0) parts.push(plasticsAvoided(i.plasticItems));
  if (i.co2Kg > 0) parts.push(`${(Math.round(i.co2Kg * 10) / 10).toFixed(1)} kg CO₂ saved`);
  return parts;
}
