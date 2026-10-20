import { memberOf } from "@/lib/members";
import { getPlace, toPublic } from "@/lib/stampPlaces";
import { wooSetup } from "@/lib/woo";

/** WooCommerce setup (webhook settings + email snippet) for an eco shop's online channel. Owners only: it contains the shop's secret. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const m = await memberOf(req, id, "owner");
  if (m instanceof Response) return m;
  const place = await getPlace(id);
  if (!place || !toPublic(place).online) return Response.json({ error: "This shop doesn't sell online. Turn on its online channel first." }, { status: 404 });
  return Response.json(wooSetup(place));
}
