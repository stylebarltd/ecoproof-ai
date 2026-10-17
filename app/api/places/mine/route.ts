import { myPlaces } from "@/lib/members";
import { getSession } from "@/lib/session";
import { toPublic } from "@/lib/stampPlaces";

/** The places the signed-in person runs, as owner or staff (with their claim links and QR). */
export async function GET(req: Request) {
  const s = await getSession(req);
  if (!s) return Response.json({ error: "Sign in first" }, { status: 401 });
  const rows = await myPlaces(s.keys);
  return Response.json({ places: rows.map((r) => ({ ...toPublic(r), role: r.role, status: r.status, statusNote: r.status === "active" ? null : r.status_note })) });
}
