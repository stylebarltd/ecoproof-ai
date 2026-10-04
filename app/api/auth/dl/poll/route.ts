import { rateLimited } from "@/lib/ratelimit";
import { pollLogin } from "@/lib/dlServer";
import { sessionHeader } from "@/lib/signin";

/** The installed app (which started the sign-in) collects its session here once the wallet has signed. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(`dlpoll:${ip}`, 600)) return Response.json({ error: "Too many attempts, try again later" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { sid?: string; claim?: string };
  if (!b.sid || !b.claim) return Response.json({ error: "sid and claim required" }, { status: 400 });
  const r = await pollLogin(b.sid, b.claim);
  return Response.json(r, { headers: { "Cache-Control": "no-store", ...("address" in r ? { "Set-Cookie": sessionHeader(r.address) } : {}) } });
}
