import type { LineItem } from "./impact";

// Demo receipts: [qty, name, price THB, category]. Shared by the receipt generator and the AI-unavailable fallback.
export type DemoKind = "superbee" | "greenmarket" | "cafe";
export const DEMO_MENUS: Record<DemoKind, [number, string, number, LineItem["category"]][]> = {
  superbee: [
    [1, "Beeswax Food Wrap Set", 490, "beeswax_wrap"],
    [1, "HexaWash Laundry Pouch", 590, "plastic_free_laundry"],
    [2, "Dentos Toothpaste Tabs", 380, "solid_personal_care"],
    [1, "Reusable Produce Bags", 290, "reusable_bag"],
  ],
  greenmarket: [
    [1, "Organic Cotton T-Shirt", 590, "not_sustainable"],
    [1, "Reusable Cotton Tote Bag", 180, "reusable_bag"],
    [2, "Bamboo Kitchen Towels", 240, "reusable_household_textile"],
    [1, "Stainless Steel Water Bottle", 450, "reusable_bottle"],
    [1, "Reusable Produce Bags", 220, "reusable_bag"],
    [1, "Organic Cotton Napkins", 290, "reusable_household_textile"],
  ],
  cafe: [
    [1, "Iced Latte", 85, "not_sustainable"],
    [1, "Oat Flat White", 95, "not_sustainable"],
    [1, "Banana Bread", 70, "not_sustainable"],
  ],
};

export const demoItems = (kind: DemoKind): LineItem[] =>
  DEMO_MENUS[kind].map(([quantity, name, , category]) => ({ name, quantity, category, confidence: 1 }));
