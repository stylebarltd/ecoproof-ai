import { createCards } from "@/lib/cards";
import { memberOf } from "@/lib/members";
import { rateLimited } from "@/lib/ratelimit";

/** Printed claim cards for a place the signed-in person runs (owner or staff). Body: { count (1-100) }. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip, 20)) return Response.json({ error: "Too many requests, try again later" }, { status: 429 });
  const { id } = await params;
  const m = await memberOf(req, id);
  if (m instanceof Response) return m;
  const { count } = (await req.json().catch(() => ({}))) as { count?: number };
  const n = Math.round(Number(count));
  if (!(n >= 1 && n <= 100)) return Response.json({ error: "count must be 1-100" }, { status: 400 });
  const { batch, codes } = await createCards(id, n);
  return Response.json({ batch, count: codes.length, printUrl: `/place/${id}/cards?batch=${batch}` }, { status: 201 });
}
