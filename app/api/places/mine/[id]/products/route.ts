import { addProduct, removeProduct, updateProduct } from "@/lib/products";
import { answer, shopMember } from "./guard";

type Ctx = { params: Promise<{ id: string }> };

/** The shop's product setup: categories, declaration, refill, its products and the queue of receipt lines to confirm. Staff can look. */
export async function GET(req: Request, { params }: Ctx) {
  const id = (await params).id;
  const m = await shopMember(req, id);
  if (m instanceof Response) return m;
  return answer(id, m.role);
}

/** Adds a product: { receiptName, displayName?, category, packagingType, productType?, pieces?, replaces?, fromQueue? }. No impact numbers are accepted:
 *  EcoProof AI looks them up by category and packaging. */
export async function POST(req: Request, { params }: Ctx) {
  const id = (await params).id;
  const m = await shopMember(req, id, "owner");
  if (m instanceof Response) return m;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return answer(id, m.role, () => addProduct(id, b));
}

/** ?product=<id>, body { productType?, pieces? }: what kind of product it is, and how many pieces are in the pack. */
export async function PATCH(req: Request, { params }: Ctx) {
  const id = (await params).id;
  const m = await shopMember(req, id, "owner");
  if (m instanceof Response) return m;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return answer(id, m.role, () => updateProduct(id, new URL(req.url).searchParams.get("product") ?? "", b));
}

/** ?product=<id> takes that product off the list. */
export async function DELETE(req: Request, { params }: Ctx) {
  const id = (await params).id;
  const m = await shopMember(req, id, "owner");
  if (m instanceof Response) return m;
  return answer(id, m.role, () => removeProduct(id, new URL(req.url).searchParams.get("product") ?? ""));
}
