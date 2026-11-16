import { query } from "@/lib/db";
import { memberOf } from "@/lib/members";
import { cleanTagline, TAGLINE_MAX, validLogo } from "@/lib/placeLogo";
import { getPlace, toPublic } from "@/lib/stampPlaces";

/**
 * The owner changes what the place shows of itself. Body: { tagline?: string, logo?: string | null }; a field left out stays as it is.
 * logo is a data URL from lib/clientLogo.ts, or null to go back to the place type's symbol.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const m = await memberOf(req, id, "owner");
  if (m instanceof Response) return m;
  const b = (await req.json().catch(() => ({}))) as { tagline?: unknown; logo?: unknown };
  if (b.tagline !== undefined) {
    const tagline = cleanTagline(b.tagline);
    if (tagline.length > TAGLINE_MAX) return Response.json({ error: `Keep the tagline to one line (${TAGLINE_MAX} characters).` }, { status: 400 });
    await query("UPDATE stamp_places SET tagline=$2 WHERE id=$1", [id, tagline || null]);
  }
  if (b.logo !== undefined) {
    if (b.logo !== null && !(typeof b.logo === "string" && validLogo(b.logo))) return Response.json({ error: "Upload a PNG, JPEG or WebP logo (small, we resize it)." }, { status: 400 });
    await query("UPDATE stamp_places SET image=$2 WHERE id=$1", [id, b.logo]);
  }
  const place = await getPlace(id);
  if (!place) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ place: { ...toPublic(place), hasLogo: !!place.image } });
}
