import { isAdmin } from "@/lib/adminAuth";
import { ReportError, decideProductReport, listProductReports } from "@/lib/moderation";

/** Our decision on one product report. Body: { confirmed: boolean }. The second confirmed report removes the product. ADMIN_TOKEN required. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { confirmed?: unknown };
  const id = Number((await params).id);
  if (!Number.isInteger(id) || typeof b.confirmed !== "boolean") return Response.json({ error: "confirmed must be true or false" }, { status: 400 });
  try { return Response.json({ result: await decideProductReport(id, b.confirmed), products: await listProductReports() }); }
  catch (e) { if (e instanceof ReportError) return Response.json({ error: e.message }, { status: e.status }); throw e; }
}
