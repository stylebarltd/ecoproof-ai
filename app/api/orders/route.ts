import { BRANDS } from "@/lib/brands";
import { OrderError, parseOrder } from "@/lib/order";
import { DuplicateOrderError, proveOrder } from "@/lib/proof";
import { getPassport } from "@/lib/passport";
import { afterProof } from "@/lib/milestones";
import { isAdmin } from "@/lib/adminAuth";
import { rateLimited } from "@/lib/ratelimit";

export const maxDuration = 60;

/**
 * Hand-made test entry point of the proof loop: { order: {brandId, orderId, items[]}, passportId }.
 * ADMIN ONLY (x-admin-token): it can write impact into any passport and trigger NFT mints, so it must never be public.
 * Real orders arrive through the signed WooCommerce webhook and the customer's own order link (lib/woo.ts).
 */
export async function POST(req: Request) {
  if (!isAdmin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip, 60)) return Response.json({ error: "Too many requests" }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { order?: unknown; passportId?: unknown } | null;
  try {
    const order = parseOrder(body?.order);
    const brand = BRANDS[order.brandId];
    if (!brand) return Response.json({ error: `Unknown brand "${order.brandId}"` }, { status: 404 });
    const passportId = String(body?.passportId ?? "").trim();
    if (!passportId || passportId.length > 64) return Response.json({ error: "passportId required" }, { status: 400 });

    const proof = await proveOrder(order, passportId, brand.name);
    const passport = await getPassport(passportId);
    const nfts = await afterProof(passportId, passport.totals, brand.name);
    return Response.json({ proof, passport, nfts }, { status: 201 });
  } catch (e) {
    if (e instanceof OrderError) return Response.json({ error: e.message }, { status: 400 });
    if (e instanceof DuplicateOrderError) return Response.json({ error: e.message, recordId: e.recordId, claimAddress: e.claimAddress }, { status: 409 });
    console.error(e);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
