import { ClaimError, claimStamp } from "@/lib/stamp";
import { claimCard } from "@/lib/cards";
import { claimOrder } from "@/lib/woo";
import { afterProof } from "@/lib/milestones";
import { getPassport } from "@/lib/passport";
import { rateLimited } from "@/lib/ratelimit";
import { AuthError, resolveUser } from "@/lib/session";

export const maxDuration = 60;

type Step = "verify" | "anchor" | "save";

/**
 * Claim doors: place QR { placeId, userId, lat?, lng? }, printed card { cardCode, userId }, or verified order { placeId, orderToken, userId }.
 * One valid claim = one stamp + one Solana proof (+ a milestone NFT when one is reached).
 * Send `Accept: application/x-ndjson` to get live progress: one JSON object per line ({step}, then {done} or {error}).
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(`claims-ip:${ip}`, 600)) return Response.json({ error: "Too many requests, try again later" }, { status: 429 }); // generous: a venue's Wi-Fi is one address
  const b = (await req.json().catch(() => ({}))) as { placeId?: unknown; cardCode?: unknown; orderToken?: unknown; userId?: unknown; lat?: unknown; lng?: unknown };
  let passportId: string;
  try { passportId = resolveUser(req, String(b.userId ?? "")); }
  catch (e) { if (e instanceof AuthError) return Response.json({ error: e.message }, { status: 401 }); throw e; }
  if (!passportId || passportId.length > 64) return Response.json({ error: "userId required" }, { status: 400 });
  if (rateLimited(`claims-user:${passportId}`, 40)) return Response.json({ error: "You're going fast. Try again in a little while." }, { status: 429 }); // per person, so one device can't spam
  const lat = Number(b.lat), lng = Number(b.lng);
  const geo = b.lat != null && b.lng != null && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

  const run = async (emit: (e: Record<string, unknown>) => void) => {
    const onStep = (s: Step) => emit({ step: s });
    const stamp = b.orderToken ? await claimOrder(String(b.placeId ?? ""), String(b.orderToken), passportId, onStep)
      : b.cardCode ? await claimCard(String(b.cardCode), passportId, onStep)
      : await claimStamp({ placeId: String(b.placeId ?? ""), passportId, source: "qr", geo, onStep });
    emit({ step: "passport" });
    const passport = await getPassport(passportId);
    const nfts = await afterProof(passportId, { points: passport.points, plasticItems: passport.totals.plasticItems, co2Kg: passport.totals.co2Kg }, undefined, (milestone) => emit({ step: "nft", milestone }));
    return { stamp, passport: { stamps: passport.totals.receipts, points: passport.points, nextMilestone: passport.nextMilestone }, nfts };
  };
  const fail = (e: unknown): { status: number; body: Record<string, unknown> } => {
    if (e instanceof ClaimError) return { status: e.status, body: { error: e.message, ...e.extra } };
    console.error(e);
    return { status: 500, body: { error: "Something went wrong. Please try again." } };
  };

  if (!(req.headers.get("accept") ?? "").includes("application/x-ndjson")) {
    try { return Response.json(await run(() => {}), { status: 201 }); }
    catch (e) { const f = fail(e); return Response.json(f.body, { status: f.status }); }
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: Record<string, unknown>) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      try { emit({ done: await run(emit) }); }
      catch (e) { const f = fail(e); emit({ error: f.body.error, status: f.status, ...f.body }); }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
