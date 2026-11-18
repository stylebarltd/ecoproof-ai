import { createHash } from "node:crypto";
import { query } from "./db";
import { appUrl } from "./nft";
import { isShop } from "./placeKinds";
import { coversOf } from "./placePhotos";
import { publishedStars, type PlaceStars } from "./placePractices";
import { shopImpact, type ShopImpact } from "./shops";

export type StampPlace = {
  id: string; name: string; kind: string; tagline: string | null; impact_note: string | null; image: string | null; colour: string | null;
  lat: number | null; lng: number | null; gps_radius_m: number | null; secret: string; owner: string | null;
  status: string; status_note: string | null; rules_accepted_at: string | null; demo: boolean; address: string | null; also_cafe: boolean;
  sells_online: boolean; website: string | null;
  /** Has at least one location (map pin): customers can visit it. Worked out by PLACE_COLS, not stored. */
  in_store: boolean;
};
/** inStore and online are the channels: every café, restaurant and hotel is in store; an eco shop is in store, online or both. */
export type PublicPlace = { id: string; name: string; kind: string; tagline: string | null; impactNote: string | null; imageUrl: string; claimUrl: string; qrUrl: string; requiresGps: boolean; demo: boolean; inStore: boolean; online: boolean };

/** The badge's URL. A place with a logo gets a version from it, so a changed logo shows at once instead of after the cache runs out. */
export const stampUrl = (p: Pick<StampPlace, "id" | "image">) =>
  `/api/stamp-places/${p.id}/stamp${p.image ? `?v=${createHash("sha1").update(p.image).digest("base64url").slice(0, 8)}` : ""}`;

export const toPublic = (p: StampPlace): PublicPlace => ({
  id: p.id, name: p.name, kind: p.kind, tagline: p.tagline, impactNote: p.impact_note,
  imageUrl: stampUrl(p), claimUrl: `${appUrl()}/c/${p.id}?src=qr`, // the link/QR a customer scans: it opens the place ready to collect
   qrUrl: `/api/stamp-places/${p.id}/qr`,
  requiresGps: !!(p.gps_radius_m && p.lat != null && p.lng != null), demo: !!p.demo,
  inStore: !!p.in_store, online: isShop(p.kind) && !!p.sells_online,
});

/** Columns for a StampPlace from `stamp_places p`, with its in-store channel worked out from its locations. */
export const PLACE_COLS = "p.*, EXISTS (SELECT 1 FROM stamp_place_locations l WHERE l.place_id = p.id) AS in_store";

export async function getPlace(id: string): Promise<StampPlace | null> {
  return (await query<StampPlace>(`SELECT ${PLACE_COLS} FROM stamp_places p WHERE p.id=$1`, [id]))[0] ?? null;
}
/** Public places: paused and removed places are not listed. */
export const listPlaces = () => query<StampPlace>(`SELECT ${PLACE_COLS} FROM stamp_places p WHERE p.status='active' ORDER BY p.created_at, p.name`);

export const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "place";

/** Calendar day in Thailand (UTC+7): "once per day" resets at local midnight for the pilot region. */
export const stampDay = (d = new Date()) => new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);

export function distanceM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000, rad = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** A place's badge: a rounded-square tile, like the EcoProof mark. Its logo on white inside a border of its colour if it uploaded one,
 *  otherwise its kind's symbol on the colour. No text: the name always stands next to it, and at 44px nobody could read it. */
export function stampSvg(p: Pick<StampPlace, "name" | "kind" | "colour" | "image"> & { in_store?: boolean }): string {
  const c = p.colour || "#8fa073";
  const glyph = p.kind === "restaurant"
    ? `<circle cx="128" cy="112" r="44" fill="#f5ead8"/><circle cx="128" cy="112" r="30" fill="none" stroke="${c}" stroke-width="5"/><path d="M70 74v34a8 8 0 0 0 8 8v30M78 74v30M86 74v34a8 8 0 0 1-8 8M186 74c-12 8-14 30-8 42h8v28M186 74v70" fill="none" stroke="#f5ead8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
    : p.kind === "eco_shop" && p.in_store === false // a shop that only sells online: a parcel
    ? `<path d="M128 70l50 20v52l-50 20-50-20V90z" fill="#f5ead8"/><path d="M78 90l50 20 50-20M128 110v52" fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round"/><path d="M103 80l50 20" stroke="${c}" stroke-width="7"/>`
    : p.kind === "hotel"
    ? `<path d="M70 150V86M70 124h116v26M186 124v-12a18 18 0 0 0-18-18h-50v30" fill="none" stroke="#f5ead8" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="94" cy="108" r="12" fill="#f5ead8"/>`
    : p.kind === "cafe"
    ? `<path d="M84 100h72v34a30 30 0 0 1-30 30h-12a30 30 0 0 1-30-30z" fill="#f5ead8"/><path d="M156 108h12a14 14 0 0 1 0 28h-14" fill="none" stroke="#f5ead8" stroke-width="9" stroke-linecap="round"/><path d="M104 76q-8-12 0-22M128 76q-8-12 0-22" fill="none" stroke="#f5ead8" stroke-width="7" stroke-linecap="round"/>`
    : `<path d="M128 74l38 22v44l-38 22-38-22V96z" fill="#f5ead8"/><path d="M128 100c-14 0-22 10-22 22 0 13 9 22 22 22 12 0 22-9 22-21 0-14-10-23-22-23z" fill="${c}"/>`;
  const inner = p.image
    ? `<clipPath id="lc"><rect x="14" y="14" width="228" height="228" rx="56"/></clipPath><rect x="14" y="14" width="228" height="228" rx="56" fill="#fff"/><image href="${esc(p.image)}" x="30" y="30" width="196" height="196" clip-path="url(#lc)" preserveAspectRatio="xMidYMid meet"/>`
    : `<g transform="translate(128 128) scale(1.25) translate(-128 -116)">${glyph}</g>`; // the symbols are drawn around (128, 116)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="${esc(p.name)}"><rect x="8" y="8" width="240" height="240" rx="62" fill="${c}"/>${inner}</svg>`;
}

/** stars: null for kinds without stars (eco shops); from the place's published declaration. impact: eco shops only, instead of stars. */
export type MapPlace = { demo: boolean; id: string; locationId: number; name: string; locationName: string | null; kind: string; tagline: string | null; imageUrl: string; coverUrl: string | null; lat: number; lng: number; stars: PlaceStars | null; impact: ShopImpact | null };

/** Places that have actually joined EcoProof and have a location (online-only shops have none), one entry per location. "Verified" on the map means
 *  claimed and set up on EcoProof (a real owner or partner created it); independent vetting is roadmap. */
export async function listMapPlaces(): Promise<MapPlace[]> {
  const rows = await query<{ id: string; name: string; kind: string; also_cafe: boolean; tagline: string | null; demo: boolean; lid: number; lname: string | null; lat: number; lng: number }>(
    "SELECT p.id, p.name, p.kind, p.also_cafe, p.tagline, p.demo, l.id AS lid, l.name AS lname, l.lat, l.lng FROM stamp_places p JOIN stamp_place_locations l ON l.place_id = p.id WHERE p.status = 'active' ORDER BY p.created_at, l.id",
  );
  const ids = [...new Set(rows.map((r) => r.id))];
  const [stars, impact, covers] = await Promise.all([publishedStars(rows), shopImpact(ids.filter((id) => isShop(rows.find((r) => r.id === id)!.kind))), coversOf(ids)]);
  return rows.map((r) => ({
    demo: r.demo, id: r.id, locationId: r.lid, name: r.name, locationName: r.lname, kind: r.kind, tagline: r.tagline, imageUrl: `/api/stamp-places/${r.id}/stamp`, coverUrl: covers.get(r.id) ?? null,
    lat: r.lat, lng: r.lng, stars: stars.get(r.id) ?? null, impact: impact.get(r.id) ?? null,
  }));
}
