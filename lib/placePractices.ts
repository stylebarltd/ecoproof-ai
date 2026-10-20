// A place's eco practices and the stars they earn. The checklist itself is data/practices.json. The owner's answers in place_practices
// are a private draft; the public sees only what was published (lib/declarations.ts).
import { query } from "./db";
import { differsFromPublished, declarationsOf, latestDeclarations, publishedAnswers, publishedToday, toDeclaration } from "./declarations";
import { checklist, nextStar, practicesOf, rating, type Answers, type Status } from "./practices";
import { GPS_RADIUS_M, isKind, isShop, isWebsite, kindOf } from "./placeKinds";

const STATUSES: Status[] = ["yes", "no", "not_applicable"];

/** Draft answers per place (the owner's checklist), for many places at once. */
export async function answersFor(placeIds: string[]): Promise<Map<string, Answers>> {
  const out = new Map<string, Answers>();
  if (!placeIds.length) return out;
  const rows = await query<{ place_id: string; practice_id: string; status: Status }>("SELECT place_id, practice_id, status FROM place_practices WHERE place_id = ANY($1)", [placeIds]);
  for (const r of rows) (out.get(r.place_id) ?? out.set(r.place_id, {}).get(r.place_id)!)[r.practice_id] = r.status;
  return out;
}

export type PlaceStars = { score: number; stars: number; label: string; answered: number };

/** The stars a place shows: null for kinds without stars. A place nobody has filled in yet is "Listed" with answered = 0. */
export function starsOf(kind: string, alsoCafe: boolean, answers: Answers): PlaceStars | null {
  const r = rating(kind, alsoCafe, answers);
  if (!r) return null;
  const ids = new Set(practicesOf(checklist(kind, alsoCafe)!).map((p) => p.id));
  return { score: r.score, stars: r.stars, label: r.label, answered: Object.keys(answers).filter((id) => ids.has(id)).length };
}

/** Public stars per place, from each place's latest published declaration. */
export async function publishedStars(places: { id: string; kind: string; also_cafe: boolean }[]): Promise<Map<string, PlaceStars | null>> {
  const latest = await latestDeclarations([...new Set(places.map((p) => p.id))]);
  return new Map(places.map((p) => [p.id, starsOf(p.kind, p.also_cafe, publishedAnswers(p, latest.get(p.id)))]));
}

/** Everything the owner's checklist screen needs: the draft, and what is published. */
export async function practiceSetup(place: {
  id: string; kind: string; also_cafe: boolean; address: string | null;
  website: string | null; ships_from: string | null; ships_from_lat: number | null; ships_from_lng: number | null; ships_to: string | null;
}) {
  const answers = (await answersFor([place.id])).get(place.id) ?? {};
  const history = await declarationsOf(place.id);
  const last = history[0];
  return {
    kind: place.kind, alsoCafe: place.also_cafe, address: place.address, answers,
    // An online shop's public details (eco shops only).
    website: place.website, shipsFrom: place.ships_from, shipsTo: place.ships_to,
    shipsFromPin: place.ships_from_lat != null && place.ships_from_lng != null ? { lat: place.ships_from_lat, lng: place.ships_from_lng } : null,
    rating: rating(place.kind, place.also_cafe, answers), next: nextStar(place.kind, place.also_cafe, answers),
    published: last ? toDeclaration(last) : null,
    publishedMatchesType: !!last && last.kind === place.kind && last.also_cafe === place.also_cafe,
    unpublishedChanges: differsFromPublished(place, answers, last),
    publishedToday: publishedToday(last),
  };
}

export class PracticeError extends Error {}

/** Saves the owner's place type, address, an eco shop's channels, and the answers. A café, restaurant or hotel needs a location, so
 *  an online-only shop can only become one after adding its shop's location (`location`, sent from the owner's phone at the shop).
 *  Answers are checked against the checklist: unknown practices are refused, and N/A only where the practice allows it. */
export async function savePractices(
  place: { id: string; name: string; kind: string; in_store: boolean; sells_online: boolean },
  input: {
    kind?: unknown; alsoCafe?: unknown; address?: unknown; answers?: unknown; online?: unknown; location?: unknown;
    website?: unknown; shipsFrom?: unknown; shipsFromPin?: unknown; shipsTo?: unknown;
  },
) {
  const kind = typeof input.kind === "string" ? input.kind : place.kind;
  if (!isKind(kind)) throw new PracticeError("Unknown place type.");
  const alsoCafe = kind === "restaurant" && input.alsoCafe === true;
  const address = typeof input.address === "string" ? input.address.trim().slice(0, 200) || null : null;

  // Channels. A location can be added here (not removed); the online channel only exists for eco shops.
  const l = input.location as { lat?: unknown; lng?: unknown } | null | undefined;
  const lat = Number(l?.lat), lng = Number(l?.lng);
  const newLoc = !place.in_store && l && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
  const inStore = place.in_store || !!newLoc;
  const online = isShop(kind) ? (typeof input.online === "boolean" ? input.online : place.sells_online) : place.sells_online;
  if (!inStore && !isShop(kind)) throw new PracticeError(`A ${kindOf(kind)!.label.toLowerCase()} needs a location. Add your shop's location first, from your phone while you're there.`);
  if (isShop(kind) && !inStore && !online) throw new PracticeError("A shop needs at least one channel: your shop, online, or both.");

  // An online shop's public details: website, where it ships from (a label and a pin, for "nearest") and where it ships to.
  const text = (v: unknown, n: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, n) || null : null);
  const website = text(input.website, 200);
  if (website && !isWebsite(website)) throw new PracticeError("Enter your website as a full address, like https://superbee.me");
  const pin = input.shipsFromPin as { lat?: unknown; lng?: unknown } | null | undefined;
  const pinLat = Number(pin?.lat), pinLng = Number(pin?.lng);
  const shipsPin = pin && Number.isFinite(pinLat) && Number.isFinite(pinLng) && Math.abs(pinLat) <= 90 && Math.abs(pinLng) <= 180 ? { lat: pinLat, lng: pinLng } : null;

  const groups = checklist(kind, alsoCafe);
  const byId = new Map(groups ? practicesOf(groups).map((p) => [p.id, p]) : []);
  const answers: [string, Status][] = [];
  for (const [id, status] of Object.entries(input.answers && typeof input.answers === "object" ? input.answers : {})) {
    const p = byId.get(id);
    if (!p) throw new PracticeError(`Unknown practice: ${id}`);
    if (!STATUSES.includes(status as Status)) throw new PracticeError(`Answer yes, no or not applicable for: ${p.label}`);
    if (status === "not_applicable" && !p.notApplicableAllowed) throw new PracticeError(`"${p.label}" applies to every place of this type.`);
    answers.push([id, status as Status]);
  }

  // One statement, so the type, the channels and the answers change together. Answers for practices outside the current checklist
  // stay stored (switching the type back restores them) but never count. A new location becomes the GPS-checked one.
  await query(
    `WITH place AS (
       UPDATE stamp_places SET kind=$2, also_cafe=$3, address=$4, sells_online=$7,
         website=$12, ships_from=$13, ships_from_lat=$14, ships_from_lng=$15, ships_to=$16,
         lat=COALESCE($8, lat), lng=COALESCE($9, lng), gps_radius_m=CASE WHEN $8::float8 IS NULL THEN gps_radius_m ELSE $10 END
       WHERE id=$1),
     loc AS (INSERT INTO stamp_place_locations (place_id, name, lat, lng) SELECT $1, $11, $8, $9 WHERE $8::float8 IS NOT NULL)
     INSERT INTO place_practices (place_id, practice_id, status) SELECT $1, a.id, a.status FROM unnest($5::text[], $6::text[]) AS a(id, status)
     ON CONFLICT (place_id, practice_id) DO UPDATE SET status=EXCLUDED.status, updated_at=now() WHERE place_practices.status <> EXCLUDED.status`,
    [place.id, kind, alsoCafe, address, answers.map((a) => a[0]), answers.map((a) => a[1]), online, newLoc?.lat ?? null, newLoc?.lng ?? null, GPS_RADIUS_M, place.name,
     website, text(input.shipsFrom, 80), shipsPin?.lat ?? null, shipsPin?.lng ?? null, text(input.shipsTo, 80)],
  );
}
