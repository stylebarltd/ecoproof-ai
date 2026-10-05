import { timingSafeEqual } from "crypto";
import { query } from "@/lib/db";

// Demo housekeeping: delete unconfirmed pledges by place id. Requires the ADMIN_TOKEN header.
export async function POST(req: Request) {
  const token = process.env.ADMIN_TOKEN ?? "";
  const given = req.headers.get("x-admin-token") ?? "";
  const ok = token.length >= 16 && given.length === token.length && timingSafeEqual(Buffer.from(given), Buffer.from(token));
  if (!ok) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { pledgePlaceIds?: string[] };
  const pledges = body.pledgePlaceIds?.length ? await query("DELETE FROM pledges WHERE place_id = ANY($1) AND owner_confirmed = false RETURNING practice", [body.pledgePlaceIds]) : [];
  return Response.json({ pledgesDeleted: pledges.length });
}
