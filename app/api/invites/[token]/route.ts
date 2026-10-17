import { acceptInvite, InviteError, readInvite } from "@/lib/members";
import { rateLimited } from "@/lib/ratelimit";
import { getSession } from "@/lib/session";

/** What an invite link is for (place name and role), without accepting it. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(`invite-read:${ip}`, 60)) return Response.json({ error: "Too many requests, try again later" }, { status: 429 });
  const info = await readInvite((await params).token);
  return info ? Response.json(info) : Response.json({ error: "This invite link isn't valid." }, { status: 404 });
}

/** Accept it, as the signed-in person. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const s = await getSession(req);
  if (!s) return Response.json({ error: "Sign in first" }, { status: 401 });
  try { return Response.json(await acceptInvite((await params).token, s)); }
  catch (e) { if (e instanceof InviteError) return Response.json({ error: e.message }, { status: 409 }); throw e; }
}
