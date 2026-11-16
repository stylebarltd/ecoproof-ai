import { saveSetup } from "@/lib/products";
import { answer, shopMember } from "../guard";

/** Body { categories?, refill?, declared?: true }: saves the parts that were sent. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const m = await shopMember(req, id, "owner");
  if (m instanceof Response) return m;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return answer(id, m.role, () => saveSetup(id, b));
}
