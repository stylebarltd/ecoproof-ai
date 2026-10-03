import { getSession } from "@/lib/session";
import { getPlace } from "@/lib/stampPlaces";
import { wooSetup } from "@/lib/woo";

/** The signed-in owner's WooCommerce setup (webhook settings + email snippet) for one of their own online shops. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = getSession(req);
  if (!s) return Response.json({ error: "Sign in first" }, { status: 401 });
  const place = await getPlace((await params).id);
  if (!place || place.owner !== s.address || place.kind !== "online") return Response.json({ error: "Not your online shop" }, { status: 404 });
  return Response.json(wooSetup(place));
}
