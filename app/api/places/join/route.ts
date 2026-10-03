import { randomBytes } from "crypto";
import { query } from "@/lib/db";
import { rateLimited } from "@/lib/ratelimit";
import { getSession } from "@/lib/session";
import { GPS_RADIUS_M, PLACE_KINDS, isKind, isPhysical, kindOf } from "@/lib/placeKinds";
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
 * Self-serve place setup. The owner signs in with a wallet (session cookie), then submits name, kind, one-line tagline and a logo.
 * The place appears on the map straight away as "claimed and set up" (not independently vetted). Physical places always get the GPS check.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip, 10)) return Response.json({ error: "Too many requests, try again later" }, { status: 429 });
  const s = getSession(req);
  if (!s) return Response.json({ error: "Sign in with your wallet first." }, { status: 401 });

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
  // Physical places must give their location: it puts them on the map and powers the GPS check, which is always on for them.
  // Online shops have neither a pin nor a GPS check.
  const physical = isPhysical(kind);
  if (physical && !validLoc) return Response.json({ error: "Add your location so customers can find you and stamps can be checked at your place." }, { status: 400 });
  const hasLoc = physical && validLoc;

  const [{ n }] = await query<{ n: number }>("SELECT COUNT(*)::int n FROM stamp_places WHERE owner=$1", [s.address]);
  if (n >= MAX_PLACES_PER_OWNER) return Response.json({ error: `You can set up up to ${MAX_PLACES_PER_OWNER} places for now.` }, { status: 409 });

  const id = `${slug(name)}-${randomBytes(2).toString("hex")}`;
  const rows = await query<StampPlace>(
    `INSERT INTO stamp_places (id,name,kind,tagline,image,colour,lat,lng,gps_radius_m,secret,owner,rules_accepted_at,status_note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),$12) RETURNING *`,
    [id, name, kind, tagline || null, logo, kindOf(kind)!.colour, hasLoc ? lat : null, hasLoc ? lng : null, hasLoc ? GPS_RADIUS_M : null, randomBytes(24).toString("hex"), s.address, `Accepted eco rules ${RULES_VERSION}`],
  );
  if (hasLoc) await query("INSERT INTO stamp_place_locations (place_id,name,lat,lng) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING", [id, name, lat, lng]);
  return Response.json({ place: toPublic(rows[0]), onMap: hasLoc }, { status: 201 });
}
