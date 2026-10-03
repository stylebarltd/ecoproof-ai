import { BRANDS } from "@/lib/brands";
import { OrderError, parseOrder } from "@/lib/order";
import { DuplicateOrderError, proveOrder } from "@/lib/proof";
import { getPassport } from "@/lib/passport";
import { afterProof } from "@/lib/milestones";
import { rateLimited } from "@/lib/ratelimit";

export const maxDuration = 60;

/**
 * Entry point of the loop. Body: { order: {brandId, orderId, items[]}, passportId }.
 * If the brand has an order key configured (env, see lib/brands.ts), the request must send it as `x-brand-key`.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip, 60)) return Response.json({ error: "Too many requests" }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { order?: unknown; passportId?: unknown } | null;
  try {
    const order = parseOrder(body?.order);
    const brand = BRANDS[order.brandId];
    if (!brand) return Response.json({ error: `Unknown brand "${order.brandId}"` }, { status: 404 });
    const key = process.env[brand.apiKeyEnv];
    if (key && req.headers.get("x-brand-key") !== key) return Response.json({ error: "Invalid brand key" }, { status: 401 });
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
