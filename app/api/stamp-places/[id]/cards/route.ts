import { createCards } from "@/lib/cards";
import { getPlace } from "@/lib/stampPlaces";
import { appUrl } from "@/lib/nft";

/** Generate a batch of printable claim cards for a place. ADMIN_TOKEN required. Body: { count (1-500) }. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return Response.json({ error: "Card generation is disabled (ADMIN_TOKEN not set)" }, { status: 503 });
  if (req.headers.get("x-admin-token") !== token) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (!(await getPlace(id))) return Response.json({ error: "Unknown place" }, { status: 404 });
  const { count } = (await req.json().catch(() => ({}))) as { count?: number };
  const n = Math.round(Number(count));
  if (!(n >= 1 && n <= 500)) return Response.json({ error: "count must be 1-500" }, { status: 400 });
  const { batch, codes } = await createCards(id, n);
  return Response.json({ batch, count: codes.length, printUrl: `${appUrl()}/place/${id}/cards?batch=${batch}&token=<ADMIN_TOKEN>` }, { status: 201 });
}
