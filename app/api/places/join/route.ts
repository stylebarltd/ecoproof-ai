import { randomBytes } from "crypto";
import { query } from "@/lib/db";
import { rateLimited } from "@/lib/ratelimit";
import { getSession } from "@/lib/session";
import { GPS_RADIUS_M, PLACE_KINDS, isKind, isShop, kindOf } from "@/lib/placeKinds";
import { RULES_VERSION } from "@/lib/ecoRules";
import { slug, toPublic, type StampPlace } from "@/lib/stampPlaces";

const MAX_PLACES_PER_OWNER = 3;

/** Magic-byte check so only real PNG/JPEG/WebP images are stored (no SVG, no scripts). */
function validLogo(dataUrl: string): boolean {
  const m = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!m || dataUrl.length > 220_000) return false;
  const b = Buffer.from(m[2].slice(0, 24), "base64");
  return (m[1] === "png" && b.subarray(0, 4).toString("hex") === "89504e47") || (m[1] === "jpeg" && b.subarray(0, 3).toString("hex") === "ffd8ff") || (m[1] === "webp" && b.subarray(0, 4).toString() === "RIFF");
}

/**
 * Self-serve place setup. The owner signs in (wallet, Google or Facebook), then submits name, kind, one-line tagline and a logo.
 * An eco shop also says how it sells: inStore (a shop customers can visit) and/or online. A place with a location appears on the map
 * straight away as "claimed and set up" (not independently vetted) and always gets the GPS check.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip, 10)) return Response.json({ error: "Too many requests, try again later" }, { status: 429 });
  const s = await getSession(req);
  if (!s) return Response.json({ error: "Sign in first." }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(b.name ?? "").trim().replace(/\s+/g, " ");
  const tagline = String(b.tagline ?? "").trim().replace(/\s+/g, " ");
  const kind = isKind(String(b.kind)) ? String(b.kind) : null;
  if (name.length < 2 || name.length > 60) return Response.json({ error: "Name must be 2-60 characters." }, { status: 400 });
  if (tagline.length > 90) return Response.json({ error: "Keep the tagline to one line (90 characters)." }, { status: 400 });
  if (!kind) return Response.json({ error: `Pick one of: ${PLACE_KINDS.map((k) => k.label.toLowerCase()).join(", ")}.` }, { status: 400 });
  const logo = typeof b.logo === "string" && b.logo ? b.logo : null;
  if (logo && !validLogo(logo)) return Response.json({ error: "Upload a PNG, JPEG or WebP logo (small, we resize it)." }, { status: 400 });
  if (b.acceptRules !== true) return Response.json({ error: "Please confirm that your place keeps the eco rules." }, { status: 400 });
  const lat = Number(b.lat), lng = Number(b.lng);
  const validLoc = b.lat != null && b.lng != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  // Places customers visit must give their location: it puts them on the map and powers the GPS check, which is always on for them.
  // An online-only shop has neither a pin nor a GPS check.
  const shop = isShop(kind);
  const inStore = !shop || b.inStore === true;
  const online = shop && b.online === true;
  if (shop && !inStore && !online) return Response.json({ error: "Tell us how customers buy from you: in your shop, online, or both." }, { status: 400 });
  if (inStore && !validLoc) return Response.json({ error: "Add your location so customers can find you and stamps can be checked at your place." }, { status: 400 });
  const hasLoc = inStore && validLoc;

  const [{ n }] = await query<{ n: number }>("SELECT COUNT(DISTINCT place_id)::int n FROM place_members WHERE member_key = ANY($1) AND role='owner'", [s.keys]);
  if (n >= MAX_PLACES_PER_OWNER) return Response.json({ error: `You can set up up to ${MAX_PLACES_PER_OWNER} places for now.` }, { status: 409 });

  const id = `${slug(name)}-${randomBytes(2).toString("hex")}`;
  const rows = await query<StampPlace>(
    `INSERT INTO stamp_places (id,name,kind,tagline,image,colour,lat,lng,gps_radius_m,secret,owner,rules_accepted_at,status_note,sells_online) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),$12,$13) RETURNING *`,
    [id, name, kind, tagline || null, logo, kindOf(kind)!.colour, hasLoc ? lat : null, hasLoc ? lng : null, hasLoc ? GPS_RADIUS_M : null, randomBytes(24).toString("hex"), s.key, `Accepted eco rules ${RULES_VERSION}`, online],
  );
  await query("INSERT INTO place_members (place_id, member_key, role, added_by) VALUES ($1,$2,'owner','join')", [id, s.key]);
  if (hasLoc) await query("INSERT INTO stamp_place_locations (place_id,name,lat,lng) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING", [id, name, lat, lng]);
  return Response.json({ place: toPublic({ ...rows[0], in_store: hasLoc }), onMap: hasLoc }, { status: 201 });
}
