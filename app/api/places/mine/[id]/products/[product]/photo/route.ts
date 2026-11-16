import { setProductPhoto } from "@/lib/products";
import { rateLimited } from "@/lib/ratelimit";
import { answer, photoBody, shopMember } from "../../guard";

/** A product's photo: the body is the JPEG itself. A new one replaces the old. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string; product: string }> }) {
  const { id, product } = await params;
  const m = await shopMember(req, id, "owner");
  if (m instanceof Response) return m;
  if (rateLimited(`photo:${m.s.key}`, 60)) return Response.json({ error: "Too many uploads, try again later" }, { status: 429 });
  const bytes = await photoBody(req);
  return answer(id, m.role, () => setProductPhoto(id, product, bytes));
}
