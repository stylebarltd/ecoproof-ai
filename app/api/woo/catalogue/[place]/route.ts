import { parseCatalogue, receiveCatalogue } from "@/lib/catalogue";
import { isShop } from "@/lib/placeKinds";
import { getPlace } from "@/lib/stampPlaces";
import { verifyWebhook } from "@/lib/woo";

export const maxDuration = 300; // the AI reads every new product's name

/**
 * A shop's plugin sends its catalogue here: { products: [{ id, name, main?, variations?: [{ id, label }] }] }, signed like its orders
 * (X-WC-Webhook-Signature = base64 HMAC-SHA256 of the body with the shop's secret). Only numbers, names and variation labels: no
 * prices, stock or descriptions. The products wait in the owner's wizard for confirmation; nothing is declared by sending them.
 */
export async function POST(req: Request, { params }: { params: Promise<{ place: string }> }) {
  const place = await getPlace((await params).place);
  if (!place) return Response.json({ error: "Unknown place" }, { status: 404 });
  const raw = await req.text();
  if (!verifyWebhook(place.secret, raw, req.headers.get("x-wc-webhook-signature"))) return Response.json({ error: "Bad signature" }, { status: 401 });
  if (!isShop(place.kind)) return Response.json({ error: "Only eco shops list products." }, { status: 400 });
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return Response.json({ error: "Send JSON" }, { status: 400 }); }
  const sent = parseCatalogue(payload);
  if (!sent) return Response.json({ error: "products must be a list" }, { status: 400 });
  return Response.json({ ok: true, ...(await receiveCatalogue(place.id, sent)) });
}
