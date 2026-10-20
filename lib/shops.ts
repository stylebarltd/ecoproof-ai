// Eco shops: the impact their customers' purchases add up to (instead of stars), and the directory at /shops.
// Impact is summed from the proofs at the shop (records.place_id). Only purchases that say what was bought carry impact: verified
// online orders today, receipts later. QR and card stamps count as visits. All figures are estimates from lib/impact.ts.
import { query } from "./db";
import { isShop } from "./placeKinds";
import { listPlaces, toPublic, type PublicPlace } from "./stampPlaces";

export type ShopImpact = { purchases: number; customers: number; plasticItems: number; co2Kg: number; packagingG: number };

const NONE: ShopImpact = { purchases: 0, customers: 0, plasticItems: 0, co2Kg: 0, packagingG: 0 };

/** Impact per shop, for many shops at once. Shops without proofs get zeros. */
export async function shopImpact(placeIds: string[]): Promise<Map<string, ShopImpact>> {
  const out = new Map(placeIds.map((id) => [id, { ...NONE }]));
  if (!placeIds.length) return out;
  const rows = await query<{ place_id: string; purchases: number; customers: number; plastic: number; co2: number; packaging: number }>(
    `SELECT place_id,
            COUNT(*) FILTER (WHERE co2_kg > 0 OR plastic_items > 0 OR packaging_g > 0)::int AS purchases,
            COUNT(DISTINCT user_id)::int AS customers,
            COALESCE(SUM(plastic_items), 0)::int AS plastic, COALESCE(SUM(co2_kg), 0)::float8 AS co2, COALESCE(SUM(packaging_g), 0)::float8 AS packaging
       FROM records WHERE place_id = ANY($1) GROUP BY place_id`,
    [placeIds],
  );
  for (const r of rows) out.set(r.place_id, { purchases: r.purchases, customers: r.customers, plasticItems: r.plastic, co2Kg: Math.round(r.co2 * 10) / 10, packagingG: Math.round(r.packaging) });
  return out;
}

export type ShopListing = PublicPlace & {
  tagline: string | null; website: string | null; shipsFrom: string | null; shipsTo: string | null; locations: number;
  /** Every point the shop can be measured from: its shop locations and its ships-from pin. */
  points: { lat: number; lng: number }[]; impact: ShopImpact;
};

/** Every active eco shop, in store or online, with its impact. */
export async function listShops(): Promise<ShopListing[]> {
  const shops = (await listPlaces()).filter((p) => isShop(p.kind));
  if (!shops.length) return [];
  const ids = shops.map((s) => s.id);
  const [impact, locs] = await Promise.all([
    shopImpact(ids),
    query<{ place_id: string; lat: number; lng: number }>("SELECT place_id, lat, lng FROM stamp_place_locations WHERE place_id = ANY($1) ORDER BY id", [ids]),
  ]);
  return shops.map((s) => {
    const mine = locs.filter((l) => l.place_id === s.id).map(({ lat, lng }) => ({ lat, lng }));
    return {
      ...toPublic(s), tagline: s.tagline, website: s.website, shipsFrom: s.ships_from, shipsTo: s.ships_to, locations: mine.length,
      points: [...mine, ...(s.ships_from_lat != null && s.ships_from_lng != null ? [{ lat: s.ships_from_lat, lng: s.ships_from_lng }] : [])],
      impact: impact.get(s.id)!,
    };
  });
}
