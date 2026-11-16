import { decideCatalogue } from "@/lib/catalogue";
import { ProductError, productSetup } from "@/lib/products";
import { shopMember } from "../guard";

/** Body { packaging, add: [{ id, type, pieces }], skip: [id] }: the owner's decision on products their shop's plugin sent. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const m = await shopMember(req, id, "owner");
  if (m instanceof Response) return m;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const r = await decideCatalogue(id, b);
    return Response.json({ ...(await productSetup(id, m.role)), report: { added: r.added, kept: 0, problems: r.problems } }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { if (e instanceof ProductError) return Response.json({ error: e.message }, { status: e.status }); throw e; }
}
