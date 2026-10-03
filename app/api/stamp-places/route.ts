import { randomBytes } from "crypto";
import { query } from "@/lib/db";
import { listPlaces, slug, toPublic, type StampPlace } from "@/lib/stampPlaces";

export const GET = async () => Response.json({ places: (await listPlaces()).map(toPublic) });

/**
 * Our own place-setup (launch partners). Requires the ADMIN_TOKEN header. Creating a place generates its QR/claim URL.
 * Body: { name, kind?: "shop"|"cafe"|"market", tagline?, impactNote?, colour?, image? (data:image/... URL), lat?, lng?, gpsRadiusM? }
 */
export async function POST(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return Response.json({ error: "Place setup is disabled (ADMIN_TOKEN not set)" }, { status: 503 });
  if (req.headers.get("x-admin-token") !== token) return Response.json({ error: "Forbidden" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(b.name ?? "").trim().slice(0, 60);
  if (!name) return Response.json({ error: "name required" }, { status: 400 });
  const kind = ["shop", "cafe", "market"].includes(String(b.kind)) ? String(b.kind) : "shop";
  const image = typeof b.image === "string" && /^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(b.image) && b.image.length < 400_000 ? b.image : null;
  const num = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  const lat = num(b.lat), lng = num(b.lng), radius = num(b.gpsRadiusM);
  const colour = /^#[0-9a-f]{6}$/i.test(String(b.colour)) ? String(b.colour) : null;
  const id = `${slug(name)}-${randomBytes(2).toString("hex")}`;
  const rows = await query<StampPlace>(
    `INSERT INTO stamp_places (id,name,kind,tagline,impact_note,image,colour,lat,lng,gps_radius_m,secret) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [id, name, kind, b.tagline ? String(b.tagline).slice(0, 120) : null, b.impactNote ? String(b.impactNote).slice(0, 120) : null, image, colour, lat, lng, radius, randomBytes(24).toString("hex")],
  );
  return Response.json({ place: toPublic(rows[0]) }, { status: 201 });
}
