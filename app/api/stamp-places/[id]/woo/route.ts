import { getPlace } from "@/lib/stampPlaces";
import { wooSetup } from "@/lib/woo";

/** Setup details for connecting a WooCommerce shop to a place (ADMIN_TOKEN required; contains the brand secret). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return Response.json({ error: "Disabled (ADMIN_TOKEN not set)" }, { status: 503 });
  if (req.headers.get("x-admin-token") !== token) return Response.json({ error: "Forbidden" }, { status: 403 });
  const place = await getPlace((await params).id);
  if (!place) return Response.json({ error: "Unknown place" }, { status: 404 });
  return Response.json(wooSetup(place));
}
