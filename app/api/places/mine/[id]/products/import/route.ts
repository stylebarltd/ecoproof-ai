import { importProducts, ProductError, productSetup } from "@/lib/products";
import { shopMember } from "../guard";

/** Body { products: [...] }: adds a prepared product list in one go (lib/products.ts importProducts). Answers with the setup and a
 *  report: how many were added, how many were already there, and what could not be added, line by line. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const m = await shopMember(req, id, "owner");
  if (m instanceof Response) return m;
  const b = (await req.json().catch(() => ({}))) as { products?: unknown };
  try {
    const report = await importProducts(id, b.products);
    return Response.json({ ...(await productSetup(id, m.role)), report }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { if (e instanceof ProductError) return Response.json({ error: e.message }, { status: e.status }); throw e; }
}
