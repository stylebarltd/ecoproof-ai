import { setPart } from "@/lib/products";
import { answer, shopMember } from "../../guard";

/** Body { partId, count }: the bundle contains `count` of that other product on the list; 0 takes it out. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string; product: string }> }) {
  const { id, product } = await params;
  const m = await shopMember(req, id, "owner");
  if (m instanceof Response) return m;
  const b = (await req.json().catch(() => ({}))) as { partId?: unknown; count?: unknown };
  return answer(id, m.role, () => setPart(id, product, b.partId, b.count));
}
