import { randomUUID } from "crypto";
import { query } from "@/lib/db";
import { checkReceiptForPlace } from "@/lib/extract";
import { PRACTICE_IDS } from "@/lib/places";
import { rateLimited } from "@/lib/ratelimit";
import { hashRecord } from "@/lib/solana";
import { AlreadyClaimedError, claimOnChain, claimUrl, receiptFingerprint } from "@/lib/claim";

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

    // One receipt = one review at one place, enforced on Solana (and mirrored in the database).
    const fp = receiptFingerprint({ receiptNumber: r.receiptNumber, date: r.date, total: r.total, merchant: r.merchant, scope: placeId });
    const taken = (addr: string | null) =>
      Response.json({ error: "This receipt has already been claimed on Solana, so it can't be used for another review.", claimAddress: addr, claimUrl: addr ? claimUrl(addr) : null }, { status: 409 });
    const dup = await query<{ claim_address: string | null }>("SELECT claim_address FROM reviews WHERE receipt_fp=$1", [fp]);
    if (dup.length) return taken(dup[0].claim_address);
    const existing = await query<{ id: string }>("SELECT id FROM reviews WHERE place_id=$1 AND user_id=$2", [placeId, userId]);
    if (existing.length && !place.demo) return Response.json({ error: "You've already reviewed this place." }, { status: 409 });

    const reviewId = randomUUID();
    const createdAt = new Date().toISOString();
    const hash = hashRecord({ id: reviewId, placeId, userId, stars, confirmed, byoCup, receiptFp: fp, createdAt });
    let signature: string | null = null;
    let claimAddress: string | null = null;
    try {
      ({ signature, claimAddress } = await claimOnChain("review", fp, `ecoproof:review:v1:${hash}`));
    } catch (e) {
      if (e instanceof AlreadyClaimedError) return taken(e.claimAddress);
      console.error("claim failed", e);
    }

    if (existing.length) await query("DELETE FROM reviews WHERE place_id=$1 AND user_id=$2", [placeId, userId]);
    try {
      await query(
        `INSERT INTO reviews (id,place_id,user_id,stars,confirmed,byo_cup,receipt_fp,receipt_date,hash,signature,created_at,claim_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [reviewId, placeId, userId, stars, JSON.stringify(confirmed), byoCup, fp, r.date, hash, signature, createdAt, claimAddress],
      );
    } catch (e) {
      if ((e as { code?: string }).code === "23505") return taken(null);
      throw e;
    }
    return Response.json({ id: reviewId, hash, signature, claimAddress, claimUrl: claimAddress ? claimUrl(claimAddress) : null, byoCup, confirmed, receipt: { merchant: r.merchant, date: r.date } });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
