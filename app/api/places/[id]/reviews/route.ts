import { randomUUID } from "crypto";
import { query } from "@/lib/db";
import { checkReceiptForPlace } from "@/lib/extract";
import { PRACTICE_IDS } from "@/lib/places";
import { rateLimited } from "@/lib/ratelimit";
import { anchorHash, hashRecord } from "@/lib/solana";
import { createHash } from "crypto";

export const maxDuration = 60;
const TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
const MAX_AGE_DAYS = 14;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: placeId } = await params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip, 15)) return Response.json({ error: "Too many uploads, try again later" }, { status: 429 });

  const form = await req.formData();
  const file = form.get("receipt");
  const userId = String(form.get("userId") || "");
  const stars = Math.round(Number(form.get("stars")));
  const confirmed = String(form.get("confirmed") || "").split(",").filter((p) => (PRACTICE_IDS as string[]).includes(p));
  const byoCup = form.get("byoCup") === "true";
  if (!(file instanceof File)) return Response.json({ error: "Receipt photo required" }, { status: 400 });
  if (!userId || userId.length > 64) return Response.json({ error: "userId required" }, { status: 400 });
  if (!(stars >= 1 && stars <= 5)) return Response.json({ error: "Pick 1–5 stars" }, { status: 400 });
  const mediaType = TYPES.find((t) => t === file.type);
  if (!mediaType) return Response.json({ error: "Unsupported image type" }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return Response.json({ error: "Image too large (max 8MB)" }, { status: 413 });

  const place = (await query<{ id: string; name: string; demo: boolean }>("SELECT id,name,demo FROM places WHERE id=$1", [placeId]))[0];
  if (!place) return Response.json({ error: "Unknown place" }, { status: 404 });

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const r = await checkReceiptForPlace(base64, mediaType, place.name);

    if (!r.matchesPlace) {
      return Response.json({ error: `This receipt doesn't look like it's from ${place.name} (it says "${r.merchant}").` }, { status: 422 });
    }
    if (!r.date) return Response.json({ error: "Couldn't read a date on the receipt. Try a clearer photo." }, { status: 422 });
    const ageDays = (Date.now() - Date.parse(r.date)) / 86_400_000;
    if (Number.isNaN(ageDays) || ageDays > MAX_AGE_DAYS || ageDays < -1) {
      return Response.json({ error: `Receipt date (${r.date}) must be within the last ${MAX_AGE_DAYS} days.` }, { status: 422 });
    }

    // One receipt = one review, across all users. Demo shops skip the global check so the demo can be rehearsed.
    const norm = r.merchant.toLowerCase().replace(/[^a-z0-9฀-๿]/g, "");
    const fp = createHash("sha256").update(`${norm}|${r.receiptNumber}|${r.date}|${r.total.toFixed(2)}`).digest("hex");
    const receiptFp = place.demo ? `demo:${fp}` : fp;
    if (!place.demo) {
      const dup = await query("SELECT 1 FROM reviews WHERE receipt_fp=$1", [receiptFp]);
      if (dup.length) return Response.json({ error: "This receipt has already been used for a review." }, { status: 409 });
    }
    const existing = await query<{ id: string }>("SELECT id FROM reviews WHERE place_id=$1 AND user_id=$2", [placeId, userId]);
    if (existing.length && !place.demo) return Response.json({ error: "You've already reviewed this place." }, { status: 409 });

    const reviewId = randomUUID();
    const createdAt = new Date().toISOString();
    const hash = hashRecord({ id: reviewId, placeId, userId, stars, confirmed, byoCup, receiptFp, createdAt });
    let signature: string | null = null;
    try {
      signature = await anchorHash(hash, "ecoproof:review:v1");
    } catch (e) {
      console.error("anchor failed", e);
    }

    if (existing.length) await query("DELETE FROM reviews WHERE place_id=$1 AND user_id=$2", [placeId, userId]);
    await query(
      `INSERT INTO reviews (id,place_id,user_id,stars,confirmed,byo_cup,receipt_fp,receipt_date,hash,signature,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [reviewId, placeId, userId, stars, JSON.stringify(confirmed), byoCup, receiptFp, r.date, hash, signature, createdAt],
    );
    return Response.json({ id: reviewId, hash, signature, byoCup, confirmed, receipt: { merchant: r.merchant, date: r.date } });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
