import { saveSample } from "@/lib/products";
import { rateLimited } from "@/lib/ratelimit";
import { answer, photoBody, shopMember } from "../guard";

/** The shop's sample receipt: the body is the JPEG itself. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const m = await shopMember(req, id, "owner");
  if (m instanceof Response) return m;
  if (rateLimited(`photo:${m.s.key}`, 60)) return Response.json({ error: "Too many uploads, try again later" }, { status: 429 });
  const bytes = await photoBody(req);
  return answer(id, m.role, () => saveSample(id, bytes));
}
