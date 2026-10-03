import { query } from "@/lib/db";
import { createCards } from "@/lib/cards";
import { rateLimited } from "@/lib/ratelimit";
import { getSession } from "@/lib/session";

/** Owner-generated printed claim cards for one of their own places. Body: { count (1-100) }. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip, 20)) return Response.json({ error: "Too many requests, try again later" }, { status: 429 });
  const s = getSession(req);
  if (!s) return Response.json({ error: "Sign in first" }, { status: 401 });
  const { id } = await params;
  const own = await query<{ id: string }>("SELECT id FROM stamp_places WHERE id=$1 AND owner=$2", [id, s.address]);
  if (!own.length) return Response.json({ error: "Not your place" }, { status: 404 });
  const { count } = (await req.json().catch(() => ({}))) as { count?: number };
  const n = Math.round(Number(count));
  if (!(n >= 1 && n <= 100)) return Response.json({ error: "count must be 1-100" }, { status: 400 });
  const { batch, codes } = await createCards(id, n);
  return Response.json({ batch, count: codes.length, printUrl: `/place/${id}/cards?batch=${batch}` }, { status: 201 });
}
