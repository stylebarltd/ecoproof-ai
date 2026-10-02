import { timingSafeEqual } from "crypto";
import { query } from "@/lib/db";

// Demo housekeeping: delete reviews by user id and/or pledges by place id. Requires the ADMIN_TOKEN header.
export async function POST(req: Request) {
  const token = process.env.ADMIN_TOKEN ?? "";
  const given = req.headers.get("x-admin-token") ?? "";
  const ok = token.length >= 16 && given.length === token.length && timingSafeEqual(Buffer.from(given), Buffer.from(token));
  if (!ok) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { userIds?: string[]; pledgePlaceIds?: string[]; reviewPlaceIds?: string[] };
  const reviews = body.userIds?.length ? await query("DELETE FROM reviews WHERE user_id = ANY($1) RETURNING id", [body.userIds]) : [];
  const placeReviews = body.reviewPlaceIds?.length ? await query("DELETE FROM reviews WHERE place_id = ANY($1) RETURNING id", [body.reviewPlaceIds]) : [];
  const pledges = body.pledgePlaceIds?.length ? await query("DELETE FROM pledges WHERE place_id = ANY($1) AND owner_confirmed = false RETURNING practice", [body.pledgePlaceIds]) : [];
  return Response.json({ reviewsDeleted: reviews.length + placeReviews.length, pledgesDeleted: pledges.length });
}
