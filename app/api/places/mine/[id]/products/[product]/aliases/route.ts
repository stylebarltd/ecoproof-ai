import { addAlias, removeAlias } from "@/lib/products";
import { answer, shopMember } from "../../guard";

type Ctx = { params: Promise<{ id: string; product: string }> };

/** Body { name }: another name the product is printed with. */
export async function POST(req: Request, { params }: Ctx) {
  const { id, product } = await params;
  const m = await shopMember(req, id, "owner");
  if (m instanceof Response) return m;
  const b = (await req.json().catch(() => ({}))) as { name?: unknown };
  return answer(id, m.role, () => addAlias(id, product, b.name));
}

/** ?name=<alias> takes that other name off the product. */
export async function DELETE(req: Request, { params }: Ctx) {
  const { id, product } = await params;
  const m = await shopMember(req, id, "owner");
  if (m instanceof Response) return m;
  return answer(id, m.role, () => removeAlias(id, product, new URL(req.url).searchParams.get("name") ?? ""));
}
