import { rateLimited } from "@/lib/ratelimit";
import { stepLogin } from "@/lib/dlServer";
import { sessionHeader } from "@/lib/signin";

/** Called by /wallet/callback with the wallet's answer. On success it also signs in the browser it runs in. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(`dl:${ip}`, 120)) return Response.json({ error: "Too many attempts, try again later" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { sid?: string; params?: Record<string, string> };
  if (!b.sid || typeof b.sid !== "string" || b.sid.length > 40) return Response.json({ error: "sid required" }, { status: 400 });
  const url = new URL(req.url);
  const r = await stepLogin(b.sid, new URLSearchParams(b.params ?? {}), { host: req.headers.get("host") ?? url.host, origin: url.origin });
  const { fresh, ...body } = r;
  // The session is issued only by the call that verified the wallet's signature, never by repeating a request with the same sid.
  return Response.json(body, { headers: { "Cache-Control": "no-store", ...(fresh && r.done ? { "Set-Cookie": sessionHeader(r.done.address) } : {}) } });
}
