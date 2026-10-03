import { ClaimError, claimStamp } from "@/lib/stamp";
import { afterProof } from "@/lib/milestones";
import { getPassport } from "@/lib/passport";
import { rateLimited } from "@/lib/ratelimit";
import { AuthError, resolveUser } from "@/lib/session";

export const maxDuration = 60;

/** The place-QR door: { placeId, userId, lat?, lng? } -> one stamp + one Solana proof (+ a milestone NFT when one is reached). */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip, 60)) return Response.json({ error: "Too many requests, try again later" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { placeId?: unknown; userId?: unknown; lat?: unknown; lng?: unknown };
  let passportId: string;
  try { passportId = resolveUser(req, String(b.userId ?? "")); }
  catch (e) { if (e instanceof AuthError) return Response.json({ error: e.message }, { status: 401 }); throw e; }
  if (!passportId || passportId.length > 64) return Response.json({ error: "userId required" }, { status: 400 });
  const lat = Number(b.lat), lng = Number(b.lng);
  const geo = b.lat != null && b.lng != null && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

  try {
    const stamp = await claimStamp({ placeId: String(b.placeId ?? ""), passportId, source: "qr", geo });
    const passport = await getPassport(passportId);
    const nfts = await afterProof(passportId, passport.totals);
    return Response.json({ stamp, passport: { stamps: passport.totals.receipts, nextMilestone: passport.nextMilestone }, nfts }, { status: 201 });
  } catch (e) {
    if (e instanceof ClaimError) return Response.json({ error: e.message, ...e.extra }, { status: e.status });
    console.error(e);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
