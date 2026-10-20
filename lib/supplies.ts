// "Where to get it": eco shops say which practices their products help with (shop_supplies), and a café, restaurant or hotel
// sees the nearest shops for the practices it doesn't keep yet. Distance counts a shop's own locations (you can go there) and
// the warehouse that ships to the café's country (lib/shipping.ts). Open to every shop, labelled, never part of the stars.
import { query } from "./db";
import { isShop, isWebsite } from "./placeKinds";
import { supplyTopics } from "./practices";
import { originFor } from "./shipping";
import { originsOf } from "./shops";
import { distanceM, listPlaces, toPublic } from "./stampPlaces";

export type Supply = { practiceId: string; product: string; url: string | null };
export type Supplier = { shopId: string; shopName: string; imageUrl: string; product: string; url: string | null; km: number | null; via: "store" | "online" | null };

export const MAX_SUPPLIERS_SHOWN = 2;

/** A shop's supplies, one per practice id. */
export const suppliesOf = (placeId: string) =>
  query<{ practice_id: string; product: string; url: string | null }>("SELECT practice_id, product, url FROM shop_supplies WHERE place_id=$1 ORDER BY practice_id", [placeId])
    .then((rows) => rows.map((r): Supply => ({ practiceId: r.practice_id, product: r.product, url: r.url })));

/** Tidies a shop's list: known practice ids only, a product name for each, a full link or none. Returns the problem in words. */
export function cleanSupplies(input: unknown): Supply[] | string {
  if (!Array.isArray(input)) return [];
  const known = new Set(supplyTopics().flatMap((t) => t.ids));
  const out = new Map<string, Supply>();
  for (const raw of input.slice(0, 200)) {
    const s = raw as { practiceId?: unknown; product?: unknown; url?: unknown };
    const practiceId = String(s.practiceId ?? "");
    if (!known.has(practiceId)) return `Unknown practice: ${practiceId}`;
    const product = typeof s.product === "string" ? s.product.trim().replace(/\s+/g, " ").slice(0, 60) : "";
    if (!product) return "Name the product for each practice you tick, like \"Glass straws\".";
    const url = typeof s.url === "string" ? s.url.trim().slice(0, 300) || null : null;
    if (url && !isWebsite(url)) return `"${product}": enter the link as a full address, like https://superbee.me/glass-straws`;
    out.set(practiceId, { practiceId, product, url });
  }
  return [...out.values()];
}

/** Today's day number: shops at the same distance (or with none) take turns at the top, day by day. */
const rotation = (id: string) => {
  let h = Math.floor(Date.now() / 86_400_000);
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
};

/**
 * The nearest shops for each practice id, for a place at `at` in `country` (both may be unknown). A shop counts through its own
 * locations, and online through the warehouse that ships to `country`; a shop that can't reach the place by either is left out
 * when the country is known. The place itself is never its own supplier.
 */
export async function suppliersFor(place: { id: string; at: { lat: number; lng: number } | null; country: string | null }, practiceIds: string[]): Promise<Record<string, Supplier[]>> {
  if (!practiceIds.length) return {};
  const rows = await query<{ place_id: string; practice_id: string; product: string; url: string | null }>(
    "SELECT place_id, practice_id, product, url FROM shop_supplies WHERE practice_id = ANY($1) AND place_id <> $2", [practiceIds, place.id],
  );
  if (!rows.length) return {};
  const shops = new Map((await listPlaces()).filter((p) => isShop(p.kind)).map((p) => [p.id, p])); // active shops only
  const ids = [...new Set(rows.map((r) => r.place_id))].filter((id) => shops.has(id));
  const [origins, locs] = await Promise.all([
    originsOf(ids),
    query<{ place_id: string; lat: number; lng: number }>("SELECT place_id, lat, lng FROM stamp_place_locations WHERE place_id = ANY($1)", [ids]),
  ]);

  // How far each shop is, and how the place would get from it.
  const reach = new Map<string, { km: number | null; via: Supplier["via"] } | null>();
  for (const id of ids) {
    const pub = toPublic(shops.get(id)!);
    const km = (p: { lat: number; lng: number }) => (place.at ? distanceM(place.at.lat, place.at.lng, p.lat, p.lng) / 1000 : null);
    const store = pub.inStore ? locs.filter((l) => l.place_id === id).map(km) : [];
    const { origin, shipsHere } = pub.online ? originFor(origins.get(id)!, place.country) : { origin: null, shipsHere: null };
    const online = pub.online && shipsHere !== false ? (origin?.lat != null && origin.lng != null ? [km({ lat: origin.lat, lng: origin.lng })] : [null]) : [];
    if (!store.length && !online.length) { reach.set(id, null); continue; } // can't reach the place
    const best = (xs: (number | null)[]) => xs.reduce<number | null>((m, x) => (x == null ? m : m == null ? x : Math.min(m, x)), null);
    const s = best(store), o = best(online);
    reach.set(id, s != null && (o == null || s <= o) ? { km: s, via: "store" } : o != null ? { km: o, via: "online" } : { km: null, via: store.length ? "store" : "online" });
  }

  const out: Record<string, Supplier[]> = {};
  for (const r of rows) {
    const shop = shops.get(r.place_id), how = reach.get(r.place_id);
    if (!shop || !how) continue;
    (out[r.practice_id] ??= []).push({ shopId: shop.id, shopName: shop.name, imageUrl: toPublic(shop).imageUrl, product: r.product, url: r.url, km: how.km == null ? null : Math.round(how.km * 10) / 10, via: how.via });
  }
  for (const list of Object.values(out)) {
    list.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity) || rotation(a.shopId) - rotation(b.shopId));
    list.splice(MAX_SUPPLIERS_SHOWN);
  }
  return out;
}

/** Where a place is, for distances: its GPS-checked location, else its first map location. */
export async function placeAt(p: { id: string; lat: number | null; lng: number | null }): Promise<{ lat: number; lng: number } | null> {
  if (p.lat != null && p.lng != null) return { lat: p.lat, lng: p.lng };
  return (await query<{ lat: number; lng: number }>("SELECT lat, lng FROM stamp_place_locations WHERE place_id=$1 ORDER BY id LIMIT 1", [p.id]))[0] ?? null;
}
