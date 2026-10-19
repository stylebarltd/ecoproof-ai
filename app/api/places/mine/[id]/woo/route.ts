import { memberOf } from "@/lib/members";
import { getPlace } from "@/lib/stampPlaces";
import { wooSetup } from "@/lib/woo";

/** WooCommerce setup (webhook settings + email snippet) for an online shop. Owners only: it contains the shop's secret. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const m = await memberOf(req, id, "owner");
  if (m instanceof Response) return m;
  const place = await getPlace(id);
  if (!place || place.kind !== "online_shop") return Response.json({ error: "Not an online shop" }, { status: 404 });
  return Response.json(wooSetup(place));
}
