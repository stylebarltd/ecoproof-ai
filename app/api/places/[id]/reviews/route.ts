import { query } from "@/lib/db";
import { PRACTICE_IDS } from "@/lib/places";
import { rateLimited } from "@/lib/ratelimit";
import { AuthError, resolveUser } from "@/lib/session";
import { resolveProof, submitGatedReview } from "@/lib/reviewGate";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: placeId } = await params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip, 60)) return Response.json({ error: "Too many requests, try again later" }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  let userId: string;
  try { userId = resolveUser(req, String(body.userId || "")); }
  catch (e) { if (e instanceof AuthError) return Response.json({ error: e.message }, { status: 401 }); throw e; }
  const stars = Math.round(Number(body.stars));
  const confirmed = String(body.confirmed || "").split(",").filter((p) => (PRACTICE_IDS as string[]).includes(p));
  const byoCup = body.byoCup === true || body.byoCup === "true";
  if (!userId || userId.length > 64) return Response.json({ error: "userId required" }, { status: 400 });
  if (!(stars >= 1 && stars <= 5)) return Response.json({ error: "Pick 1–5 stars" }, { status: 400 });

  const place = (await query<{ id: string; name: string; demo: boolean }>("SELECT id,name,demo FROM places WHERE id=$1", [placeId]))[0];
  if (!place) return Response.json({ error: "Unknown place" }, { status: 404 });

  // Reviews are gated on a purchase proof. Receipt photos are no longer accepted; the new proof system plugs in via resolveProof.
  const proof = await resolveProof(body.proof);
  if (!proof) return Response.json({ error: "Reviews are paused while we switch to order-based proofs." }, { status: 501 });

  try {
    const r = await submitGatedReview({ placeId, placeDemo: place.demo, userId, stars, confirmed, byoCup, proof });
    return Response.json(r.body, { status: r.status });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
