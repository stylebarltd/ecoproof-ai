import { superbeeParts } from "./superbeeCatalogue";
import type { Part } from "./superbeeCatalogue";

// Per-place product catalogues: a place that has one gets exact impact for its products (by WooCommerce product id, then by name);
// everyone else falls back to the AI. A place is just a place: add an entry here (and its data file) to give another shop a catalogue.
type Lookup = (productId: number | undefined, name: string) => Part[] | null;
const CATALOGUES: Record<string, Lookup> = {
  superbee: superbeeParts, // the first shop to connect its WooCommerce store
};

/** What an order line contains, from the place's catalogue. null = this place has no catalogue, or doesn't know the product. */
export const cataloguePartsFor = (placeId: string, productId: number | undefined, name: string): Part[] | null => CATALOGUES[placeId]?.(productId, name) ?? null;
