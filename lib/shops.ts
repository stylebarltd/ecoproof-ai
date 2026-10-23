// Eco shops: the impact their customers' purchases add up to (instead of stars), and the directory at /shops.
// Impact is summed from the proofs at the shop (records.place_id). Only purchases that say what was bought carry impact: verified
// online orders today, receipts later. QR and card stamps count as visits. All figures are estimates from lib/impact.ts.
import { query } from "./db";
import { isShop } from "./placeKinds";
import { originFor, type ShipOrigin } from "./shipping";
import { explorerUrl } from "./solana";
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

export type ShopProof = { id: string; createdAt: string; summary: string; plasticItems: number; co2Kg: number; txUrl: string | null };

/** The newest verified purchases at a shop, the proofs behind its impact: what was bought (names only), what it saved, and the Solana tx. */
export async function shopProofs(placeId: string, limit = 8): Promise<ShopProof[]> {
  const rows = await query<{ id: string; items: string; plastic_items: number; co2_kg: number; signature: string | null; created_at: string }>(
    `SELECT id, items, plastic_items, co2_kg, signature, created_at FROM records
      WHERE place_id = $1 AND (co2_kg > 0 OR plastic_items > 0 OR packaging_g > 0) ORDER BY created_at DESC LIMIT $2`,
    [placeId, limit],
  );
  return rows.map((r) => {
    let items: { name: string; quantity: number }[] = [];
    try { items = JSON.parse(r.items); } catch { /* an unreadable items column still lists as a proof */ }
    const names = items.map((i) => (i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name));
    const summary = names.length > 2 ? `${names.slice(0, 2).join(", ")} and ${names.length - 2} more` : names.join(", ");
    return { id: r.id, createdAt: new Date(r.created_at).toISOString(), summary, plasticItems: r.plastic_items, co2Kg: Math.round(r.co2_kg * 10) / 10, txUrl: r.signature ? explorerUrl(r.signature) : null };
  });
}

/** A shop's shipping origins (ship_origins), for many shops at once, in the order the owner listed them. */
export async function originsOf(placeIds: string[]): Promise<Map<string, ShipOrigin[]>> {
  const out = new Map<string, ShipOrigin[]>(placeIds.map((id) => [id, []]));
  if (!placeIds.length) return out;
  const rows = await query<ShipOrigin & { place_id: string }>("SELECT place_id, label, lat, lng, countries FROM ship_origins WHERE place_id = ANY($1) ORDER BY id", [placeIds]);
  for (const { place_id, ...o } of rows) out.get(place_id)?.push(o);
  return out;
}

export type ShopListing = PublicPlace & {
  website: string | null; locations: number; impact: ShopImpact;
  /** All of the shop's shipping origins, and the one that serves the visitor's country (shipsHere false: it doesn't ship there). */
  origins: ShipOrigin[]; origin: ShipOrigin | null; shipsHere: boolean | null;
  /** Every point the shop can be measured from: its shop locations, and the pin of the origin that serves the visitor. */
  points: { lat: number; lng: number }[];
};

/** Every active eco shop, in store or online, with its impact and, for a visitor in `country`, where it ships from. */
export async function listShops(country: string | null): Promise<ShopListing[]> {
  const shops = (await listPlaces()).filter((p) => isShop(p.kind));
  if (!shops.length) return [];
  const ids = shops.map((s) => s.id);
  const [impact, origins, locs] = await Promise.all([
    shopImpact(ids),
    originsOf(ids),
    query<{ place_id: string; lat: number; lng: number }>("SELECT place_id, lat, lng FROM stamp_place_locations WHERE place_id = ANY($1) ORDER BY id", [ids]),
  ]);
  return shops.map((s) => {
    const p = toPublic(s);
    const mine = locs.filter((l) => l.place_id === s.id).map(({ lat, lng }) => ({ lat, lng }));
    const all = p.online ? origins.get(s.id)! : [];
    const { origin, shipsHere } = originFor(all, country);
    return {
      ...p, website: p.online ? s.website : null, locations: mine.length, impact: impact.get(s.id)!, origins: all, origin, shipsHere,
      points: [...mine, ...(origin?.lat != null && origin.lng != null ? [{ lat: origin.lat, lng: origin.lng }] : [])],
    };
  });
}
