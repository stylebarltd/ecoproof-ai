import { ReportError, reportPlace } from "@/lib/moderation";
import { rateLimited } from "@/lib/ratelimit";
import { AuthError, resolveUser } from "@/lib/session";

/** A customer reports a place that doesn't keep the eco rules. Body: { reason, details?, userId }. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip, 15)) return Response.json({ error: "Too many requests, try again later" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { reason?: unknown; details?: unknown; userId?: unknown };
  let reporter: string;
  try { reporter = resolveUser(req, String(b.userId ?? "")); }
  catch (e) { if (e instanceof AuthError) return Response.json({ error: e.message }, { status: 401 }); throw e; }
  if (!reporter || reporter.length > 64) return Response.json({ error: "userId required" }, { status: 400 });
  try {
    const r = await reportPlace((await params).id, reporter, String(b.reason ?? ""), String(b.details ?? "").trim());
    return Response.json({ ok: true, underReview: r.underReview }, { status: 201 });
  } catch (e) {
    if (e instanceof ReportError) return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
