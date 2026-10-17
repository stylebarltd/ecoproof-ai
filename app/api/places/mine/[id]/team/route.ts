import { createInvite, InviteError, memberOf, removeMember, team } from "@/lib/members";
import { rateLimited } from "@/lib/ratelimit";

/** Who runs the place, and open invites. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const m = await memberOf(req, id);
  if (m instanceof Response) return m;
  return Response.json({ role: m.role, ...(await team(id, m.s.keys)) }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * Body { action: "invite", role: "staff" | "owner" } (owners only): a one-time link, valid 7 days. An owner invite hands the place over.
 * Body { action: "remove", key }: owners remove people; anyone can remove themselves. The last owner can't leave.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const b = (await req.json().catch(() => ({}))) as { action?: string; role?: string; key?: string };
  const m = await memberOf(req, id, b.action === "invite" ? "owner" : "staff");
  if (m instanceof Response) return m;
  if (b.action === "invite") {
    if (b.role !== "staff" && b.role !== "owner") return Response.json({ error: "role must be staff or owner" }, { status: 400 });
    if (rateLimited(`invite:${m.s.key}`, 30)) return Response.json({ error: "Too many invites, try again later" }, { status: 429 });
    const token = await createInvite(id, b.role, m.s.key);
    return Response.json({ url: `${new URL(req.url).origin}/shop/invite/${token}` }, { status: 201 });
  }
  if (b.action === "remove") {
    try { await removeMember(id, String(b.key ?? ""), { role: m.role, keys: m.s.keys }); }
    catch (e) { if (e instanceof InviteError) return Response.json({ error: e.message }, { status: 409 }); throw e; }
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
