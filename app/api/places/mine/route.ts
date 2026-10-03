import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { toPublic, type StampPlace } from "@/lib/stampPlaces";

/** The signed-in owner's self-serve places (with their claim links and QR). */
export async function GET(req: Request) {
  const s = getSession(req);
  if (!s) return Response.json({ error: "Sign in first" }, { status: 401 });
  const rows = await query<StampPlace>("SELECT * FROM stamp_places WHERE owner=$1 ORDER BY created_at", [s.address]);
  return Response.json({ places: rows.map((r) => ({ ...toPublic(r), status: r.status, statusNote: r.status === "active" ? null : r.status_note })) });
}
