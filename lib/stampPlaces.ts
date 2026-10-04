import { query } from "./db";
import { appUrl } from "./nft";

export type StampPlace = {
  id: string; name: string; kind: string; tagline: string | null; impact_note: string | null; image: string | null; colour: string | null;
  lat: number | null; lng: number | null; gps_radius_m: number | null; secret: string; owner: string | null;
  status: string; status_note: string | null; rules_accepted_at: string | null; demo: boolean;
};
export type PublicPlace = { id: string; name: string; kind: string; tagline: string | null; impactNote: string | null; imageUrl: string; claimUrl: string; qrUrl: string; requiresGps: boolean; demo: boolean };

export const toPublic = (p: StampPlace): PublicPlace => ({
  id: p.id, name: p.name, kind: p.kind, tagline: p.tagline, impactNote: p.impact_note,
  imageUrl: `/api/stamp-places/${p.id}/stamp`, claimUrl: `${appUrl()}/c/${p.id}?src=qr`, // the link/QR a customer scans: it opens the place ready to collect
   qrUrl: `/api/stamp-places/${p.id}/qr`,
  requiresGps: !!(p.gps_radius_m && p.lat != null && p.lng != null), demo: !!p.demo,
});

export async function getPlace(id: string): Promise<StampPlace | null> {
  return (await query<StampPlace>("SELECT * FROM stamp_places WHERE id=$1", [id]))[0] ?? null;
}
/** Public places: paused and removed places are not listed. */
export const listPlaces = () => query<StampPlace>("SELECT * FROM stamp_places WHERE status='active' ORDER BY created_at, name");

export const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "place";

/** Calendar day in Thailand (UTC+7): "once per day" resets at local midnight for the pilot region. */
export const stampDay = (d = new Date()) => new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);

export function distanceM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000, rad = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Round "stamp" artwork for a place: its logo if it has uploaded one, otherwise a generated honey-ringed badge. */
export function stampSvg(p: Pick<StampPlace, "name" | "kind" | "colour" | "image">, opts: { labels?: boolean } = {}): string {
  const c = p.colour || "#8fa073";
  const ring = Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2; return `<circle cx="${(128 + 116 * Math.cos(a)).toFixed(1)}" cy="${(128 + 116 * Math.sin(a)).toFixed(1)}" r="6" fill="#f5ead8"/>`; }).join("");
  const glyph = p.kind === "restaurant"
    ? `<circle cx="128" cy="112" r="44" fill="#f5ead8"/><circle cx="128" cy="112" r="30" fill="none" stroke="${c}" stroke-width="5"/><path d="M70 74v34a8 8 0 0 0 8 8v30M78 74v30M86 74v34a8 8 0 0 1-8 8M186 74c-12 8-14 30-8 42h8v28M186 74v70" fill="none" stroke="#f5ead8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
    : p.kind === "online"
    ? `<path d="M128 70l50 20v52l-50 20-50-20V90z" fill="#f5ead8"/><path d="M78 90l50 20 50-20M128 110v52" fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round"/><path d="M103 80l50 20" stroke="${c}" stroke-width="7"/>`
    : p.kind === "cafe"
    ? `<path d="M84 100h72v34a30 30 0 0 1-30 30h-12a30 30 0 0 1-30-30z" fill="#f5ead8"/><path d="M156 108h12a14 14 0 0 1 0 28h-14" fill="none" stroke="#f5ead8" stroke-width="9" stroke-linecap="round"/><path d="M104 76q-8-12 0-22M128 76q-8-12 0-22" fill="none" stroke="#f5ead8" stroke-width="7" stroke-linecap="round"/>`
    : `<path d="M128 74l38 22v44l-38 22-38-22V96z" fill="#f5ead8"/><path d="M128 100c-14 0-22 10-22 22 0 13 9 22 22 22 12 0 22-9 22-21 0-14-10-23-22-23z" fill="${c}"/>`;
  const name = esc(p.name.length > 18 ? p.name.slice(0, 17) + "…" : p.name);
  const inner = p.image ? `<clipPath id="lc"><circle cx="128" cy="116" r="62"/></clipPath><circle cx="128" cy="116" r="62" fill="#fff8e6"/><image href="${esc(p.image)}" x="70" y="58" width="116" height="116" clip-path="url(#lc)" preserveAspectRatio="xMidYMid meet"/>` : glyph;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="${name} stamp"><circle cx="128" cy="128" r="124" fill="${c}"/>${ring}<circle cx="128" cy="128" r="100" fill="none" stroke="#f5ead8" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>${inner}${opts.labels === false ? "" : `<text x="128" y="206" text-anchor="middle" font-family="Figtree,system-ui,sans-serif" font-size="22" font-weight="800" fill="#f5ead8">${name}</text>`}</svg>`;
}

export type MapPlace = { demo: boolean; id: string; locationId: number; name: string; locationName: string | null; kind: string; tagline: string | null; imageUrl: string; lat: number; lng: number };

/** Places that have actually joined EcoProof and have a physical location, one entry per location. "Verified" on the map means
 *  claimed and set up on EcoProof (a real owner or partner created it); independent vetting is roadmap. */
export async function listMapPlaces(): Promise<MapPlace[]> {
  const rows = await query<{ id: string; name: string; kind: string; tagline: string | null; demo: boolean; lid: number; lname: string | null; lat: number; lng: number }>(
    "SELECT p.id, p.name, p.kind, p.tagline, p.demo, l.id AS lid, l.name AS lname, l.lat, l.lng FROM stamp_places p JOIN stamp_place_locations l ON l.place_id = p.id WHERE p.status = 'active' ORDER BY p.created_at, l.id",
  );
  return rows.map((r) => ({ demo: r.demo, id: r.id, locationId: r.lid, name: r.name, locationName: r.lname, kind: r.kind, tagline: r.tagline, imageUrl: `/api/stamp-places/${r.id}/stamp`, lat: r.lat, lng: r.lng }));
}
