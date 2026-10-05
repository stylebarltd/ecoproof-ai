import { getPlace } from "@/lib/stampPlaces";
import { verifyWebhook } from "@/lib/woo";
import { rateLimited } from "@/lib/ratelimit";
import { confirmProduct, estimateProduct, getProductImpacts, type ProductDetails } from "@/lib/productImpact";

export const maxDuration = 60;

/**
 * The shop's plugin manages its products' impact here. Signed like the order webhook (X-WC-Webhook-Signature = base64
 * HMAC-SHA256 of the raw body with the place's secret). Only public product details arrive: no prices, no customer data.
 *   { action: "estimate", product: ProductDetails, force?: true }  -> the product's impact (AI estimate made if needed)
 *   { action: "confirm", productId, name, numbers | null }         -> the shop confirms or corrects (null: back to the estimate)
 *   { action: "get", productIds: number[] }                        -> stored impacts
 */
export async function POST(req: Request, { params }: { params: Promise<{ place: string }> }) {
  const place = await getPlace((await params).place);
  if (!place) return Response.json({ error: "Unknown place" }, { status: 404 });
  const raw = await req.text();
  if (!verifyWebhook(place.secret, raw, req.headers.get("x-wc-webhook-signature"))) return Response.json({ error: "Bad signature" }, { status: 401 });
  let b: Record<string, unknown>;
  try { b = JSON.parse(raw); } catch { return Response.json({ error: "Bad JSON" }, { status: 400 }); }

  if (b.action === "get") {
    const ids = (Array.isArray(b.productIds) ? b.productIds : []).map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 200);
    return Response.json({ impacts: Object.fromEntries(await getProductImpacts(place.id, ids)) });
  }

  if (b.action === "confirm") {
    const productId = Number(b.productId);
    if (!Number.isInteger(productId) || productId <= 0) return Response.json({ error: "productId required" }, { status: 400 });
    const numbers = b.numbers && typeof b.numbers === "object" ? (b.numbers as Record<string, unknown>) : null;
    return Response.json({ impact: await confirmProduct(place.id, productId, String(b.name ?? ""), numbers && { category: numbers.category, replaces: numbers.replaces, co2PerUnit: numbers.co2PerUnit, excluded: numbers.excluded }) });
  }

  if (b.action === "estimate") {
    const p = b.product as ProductDetails | undefined;
    if (!p || !Number.isInteger(Number(p.id)) || Number(p.id) <= 0 || !String(p.name ?? "").trim()) return Response.json({ error: "product with id and name required" }, { status: 400 });
    if (rateLimited(`product-estimates:${place.id}`, 400)) return Response.json({ error: "Too many estimates, try again in an hour" }, { status: 429 }); // each new estimate is a paid AI call
    try {
      return Response.json({ impact: await estimateProduct(place.id, { ...p, id: Number(p.id) }, b.force === true) });
    } catch (e) {
      console.error("product estimate failed", e);
      return Response.json({ error: "Could not estimate this product right now" }, { status: 503 });
    }
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
