import { ingestOrder, parseWoo, verifyWebhook } from "@/lib/woo";
import { getPlace } from "@/lib/stampPlaces";

/**
 * WooCommerce's built-in webhook (Settings > Advanced > Webhooks, topic "Order updated") delivers orders here.
 * Authenticated by X-WC-Webhook-Signature = base64(HMAC-SHA256(raw body, brand secret)). Only completed orders become claimable.
 * Replies 200 for anything valid-but-irrelevant: Woo disables a webhook after repeated non-2xx replies.
 */
export async function POST(req: Request, { params }: { params: Promise<{ place: string }> }) {
  const place = await getPlace((await params).place);
  if (!place) return Response.json({ error: "Unknown place" }, { status: 404 });
  const raw = await req.text();
  if (!verifyWebhook(place.secret, raw, req.headers.get("x-wc-webhook-signature"))) return Response.json({ error: "Bad signature" }, { status: 401 });

  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return Response.json({ ok: true, ping: true }); } // Woo's creation ping is form-encoded, not JSON
  const order = parseWoo(payload);
  if (!order) return Response.json({ ok: true, result: "ignored" });
  try {
    return Response.json({ ok: true, order: order.orderId, result: await ingestOrder(place.id, order) });
  } catch (e) {
    console.error("woo ingest failed", e); // 500 so WooCommerce retries
    return Response.json({ error: "Could not process the order" }, { status: 500 });
  }
}
