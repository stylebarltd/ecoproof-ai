import { dismissLine } from "@/lib/products";
import { answer, shopMember } from "../guard";

/** Body { dismiss: rawText }: that receipt line is not plastic-free, so it leaves the queue. (Confirming one is adding it as a product.) */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const m = await shopMember(req, id, "owner");
  if (m instanceof Response) return m;
  const b = (await req.json().catch(() => ({}))) as { dismiss?: unknown };
  if (typeof b.dismiss !== "string" || !b.dismiss.trim()) return Response.json({ error: "dismiss must be the receipt line" }, { status: 400 });
  return answer(id, m.role, () => dismissLine(id, b.dismiss as string));
}
