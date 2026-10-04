import { rateLimited } from "@/lib/ratelimit";
import { startLogin } from "@/lib/dlServer";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(`dl:${ip}`, 60)) return Response.json({ error: "Too many attempts, try again later" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { provider?: string; claim?: string; returnTo?: string };
  if (b.provider !== "phantom" && b.provider !== "solflare") return Response.json({ error: "Unknown wallet" }, { status: 400 });
  if (!b.claim || b.claim.length < 16 || b.claim.length > 100) return Response.json({ error: "claim required" }, { status: 400 });
  const origin = new URL(req.url).origin;
  return Response.json(await startLogin(b.provider, b.claim, String(b.returnTo ?? "/"), origin), { headers: { "Cache-Control": "no-store" } });
}
