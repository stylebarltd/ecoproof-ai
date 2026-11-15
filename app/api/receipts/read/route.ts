import { readReceipt } from "@/lib/receipts";
import { ClaimError } from "@/lib/stamp";
import { rateLimited } from "@/lib/ratelimit";
import { AuthError, resolveUser } from "@/lib/session";

export const maxDuration = 60;

const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_B64 = 3_500_000; // ~2.6 MB of JPEG; the client downsizes to 1600px first

/**
 * Step one of the receipt door: { image (base64, no data: prefix), mediaType, lat, lng, userId } → a review with a signed
 * token (lib/receipts.ts). Nothing is stored here; the stamp is claimed by POST /api/claims { receiptToken }.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(`receipts-ip:${ip}`, 120)) return Response.json({ error: "Too many requests, try again later" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { image?: unknown; mediaType?: unknown; lat?: unknown; lng?: unknown; userId?: unknown };
  let passportId: string;
  try { passportId = await resolveUser(req, String(b.userId ?? "")); }
  catch (e) { if (e instanceof AuthError) return Response.json({ error: e.message }, { status: 401 }); throw e; }
  if (!passportId || passportId.length > 64) return Response.json({ error: "userId required" }, { status: 400 });
  // A model call per photo: a dozen an hour per person is plenty for a shopping trip and a few retakes.
  if (rateLimited(`receipts-user:${passportId}`, 12)) return Response.json({ error: "That's a lot of receipts in one hour. Try again a little later." }, { status: 429 });

  const image = typeof b.image === "string" ? b.image.replace(/^data:[^,]*,/, "") : "";
  const mediaType = String(b.mediaType ?? "image/jpeg");
  if (!image || image.length > MAX_B64 || !/^[A-Za-z0-9+/=]+$/.test(image.slice(0, 2000))) return Response.json({ error: "Send the photo as base64 (max ~2.5 MB)." }, { status: 400 });
  if (!TYPES.has(mediaType)) return Response.json({ error: "Send a JPEG, PNG or WebP photo." }, { status: 415 });
  const lat = Number(b.lat), lng = Number(b.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return Response.json({ error: "Share your location to scan a receipt: it must be scanned in the shop.", needsGps: true }, { status: 422 });

  try {
    const review = await readReceipt({ imageBase64: image, mediaType: mediaType as "image/jpeg" | "image/png" | "image/webp", geo: { lat, lng }, passportId });
    return Response.json(review);
  } catch (e) {
    if (e instanceof ClaimError) return Response.json({ error: e.message, ...e.extra }, { status: e.status });
    console.error(e);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
