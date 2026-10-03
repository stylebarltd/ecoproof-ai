import { createHmac, timingSafeEqual } from "crypto";
import { query } from "./db";
import { appUrl } from "./nft";
import { computeImpact, type Impact, type LineItem } from "./impact";
import { matchItems } from "./order";
import { ClaimError, claimStamp, type StampResult } from "./stamp";
import { getPlace } from "./stampPlaces";

// Premium door: WooCommerce's built-in webhook sends the completed order here; the shop's order email carries a signed link
// (and QR) to claim it. Only this door proves a real order happened, so only its stamp carries a real impact line.
// The brand secret (stamp_places.secret) both authenticates webhooks (X-WC-Webhook-Signature) and signs the claim links.

const b64url = (b: Buffer) => b.toString("base64url");
const safeEq = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

/** Signature of an order link. The shop's snippet computes the same value: hash_hmac('sha256', "ecoproof:order-link:v1:<place>:<order>", secret). */
export const linkSig = (secret: string, placeId: string, orderId: string) =>
  b64url(createHmac("sha256", secret).update(`ecoproof:order-link:v1:${placeId}:${orderId}`).digest()).slice(0, 22);

export const orderToken = (secret: string, placeId: string, orderId: string) => `${orderId}.${linkSig(secret, placeId, orderId)}`;
export const orderUrl = (secret: string, placeId: string, orderId: string) => `${appUrl()}/o/${placeId}/${orderToken(secret, placeId, orderId)}`;

/** Splits and verifies `<orderId>.<sig>`. Returns the order id, or null if the token is malformed or the signature is wrong. */
export function verifyToken(secret: string, placeId: string, token: string): string | null {
  const i = token.lastIndexOf(".");
  if (i < 1) return null;
  const orderId = token.slice(0, i), sig = token.slice(i + 1);
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(orderId)) return null;
  return safeEq(sig, linkSig(secret, placeId, orderId)) ? orderId : null;
}

/** WooCommerce signs the raw request body: base64(HMAC-SHA256(body, secret)) in X-WC-Webhook-Signature. */
export function verifyWebhook(secret: string, rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  return safeEq(signature, createHmac("sha256", secret).update(rawBody, "utf8").digest("base64"));
}

export type WooOrder = { orderId: string; status: string; items: { name: string; quantity: number }[] };
/** Keeps only what the impact engine needs (order id, status, product names and quantities). Everything else in the payload, including all customer data and prices, is dropped. */
export function parseWoo(payload: unknown): WooOrder | null {
  const o = payload as { id?: unknown; status?: unknown; line_items?: unknown } | null;
  if (!o || typeof o !== "object" || o.id == null || typeof o.status !== "string" || !Array.isArray(o.line_items)) return null;
  const orderId = String(o.id);
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(orderId)) return null;
  const items = (o.line_items as { name?: unknown; quantity?: unknown }[])
    .map((l) => ({ name: String(l?.name ?? "").trim().slice(0, 200), quantity: Math.round(Number(l?.quantity)) }))
    .filter((l) => l.name && l.quantity >= 1 && l.quantity <= 1000);
  return { orderId, status: o.status, items };
}

export function impactLine(i: Impact): string {
  const parts: string[] = [];
  if (i.plasticItems > 0) parts.push(`${i.plasticItems} single-use plastic${i.plasticItems === 1 ? "" : "s"} avoided`);
  if (i.co2Kg > 0) parts.push(`${i.co2Kg} kg CO₂ saved`);
  return parts.join(" · ") || "Plastic-free order";
}

/** Stores (or refreshes, while unclaimed) the impact of a completed order. A refund/cancel voids an unclaimed order. */
export async function ingestOrder(placeId: string, w: WooOrder): Promise<"stored" | "voided" | "ignored" | "already-claimed"> {
  const existing = (await query<{ claimed_at: string | null }>("SELECT claimed_at FROM woo_orders WHERE place_id=$1 AND order_id=$2", [placeId, w.orderId]))[0];
  if (existing?.claimed_at) return "already-claimed";
  if (["refunded", "cancelled", "failed", "trash"].includes(w.status)) {
    if (existing) await query("UPDATE woo_orders SET status='void', updated_at=now() WHERE place_id=$1 AND order_id=$2", [placeId, w.orderId]);
    return existing ? "voided" : "ignored";
  }
  if (w.status !== "completed" || !w.items.length) return "ignored";
  const matched = await matchItems({ brandId: placeId, orderId: w.orderId, items: w.items });
  const items: LineItem[] = matched.map(({ source: _s, ...li }) => li);
  const impact = computeImpact(items);
  await query(
    `INSERT INTO woo_orders (place_id, order_id, items, impact, line) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (place_id, order_id) DO UPDATE SET status='valid', items=EXCLUDED.items, impact=EXCLUDED.impact, line=EXCLUDED.line, updated_at=now()`,
    [placeId, w.orderId, JSON.stringify(items), JSON.stringify(impact), impactLine(impact)],
  );
  return "stored";
}

type OrderRow = { place_id: string; order_id: string; status: string; items: string; impact: string; line: string; claimed_at: string | null };
export const getOrder = async (placeId: string, orderId: string) =>
  (await query<OrderRow>("SELECT * FROM woo_orders WHERE place_id=$1 AND order_id=$2", [placeId, orderId]))[0] ?? null;

/** Redeem an order link: verify the signature, reserve the order atomically, then stamp with its real impact. */
export async function claimOrder(placeId: string, token: string, passportId: string, onStep?: (s: "verify" | "anchor" | "save") => void): Promise<StampResult> {
  const place = await getPlace(placeId);
  if (!place) throw new ClaimError("This link isn't valid.", 404);
  const orderId = verifyToken(place.secret, placeId, token);
  if (!orderId) throw new ClaimError("This link isn't valid.", 404);
  const order = await getOrder(placeId, orderId);
  if (!order) throw new ClaimError("We haven't received this order yet. Please try again in a minute.", 404, { retry: true });
  if (order.status !== "valid") throw new ClaimError("This order can't be claimed (it was cancelled or refunded).", 410);
  const reserved = await query("UPDATE woo_orders SET claimed_at=now() WHERE place_id=$1 AND order_id=$2 AND claimed_at IS NULL AND status='valid' RETURNING order_id", [placeId, orderId]);
  if (!reserved.length) throw new ClaimError("This order has already been claimed.", 409);
  try {
    const stamp = await claimStamp({ placeId, passportId, source: "order", place, onStep, order: { orderId, items: JSON.parse(order.items), impact: JSON.parse(order.impact), line: order.line } });
    await query("UPDATE woo_orders SET record_id=$3 WHERE place_id=$1 AND order_id=$2", [placeId, orderId, stamp.recordId]);
    return stamp;
  } catch (e) {
    if (!(e instanceof ClaimError && e.status === 409)) await query("UPDATE woo_orders SET claimed_at=NULL WHERE place_id=$1 AND order_id=$2", [placeId, orderId]);
    throw e;
  }
}

