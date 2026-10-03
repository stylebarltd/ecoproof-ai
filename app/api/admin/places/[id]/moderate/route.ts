import { isAdmin } from "@/lib/adminAuth";
import { ReportError, moderate, type ModerationAction } from "@/lib/moderation";

/** Our decision on a place. Body: { action: "suspend" | "restore" | "review", note? }. ADMIN_TOKEN required. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { action?: string; note?: string };
  if (!["suspend", "restore", "review"].includes(String(b.action))) return Response.json({ error: "action must be suspend, restore or review" }, { status: 400 });
  try { return Response.json({ status: await moderate((await params).id, b.action as ModerationAction, String(b.note ?? "")) }); }
  catch (e) { if (e instanceof ReportError) return Response.json({ error: e.message }, { status: e.status }); throw e; }
}
