import { rateLimited } from "@/lib/ratelimit";
import { checkSignIn, walletSignIn, withCookies } from "@/lib/signin";

/** Step 2: verify the wallet's signature, burn the nonce, then sign in to the wallet's account (or add the wallet to the one signed in). */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip, 60)) return Response.json({ error: "Too many attempts, try again later" }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { address?: string; message?: string; signature?: string };
  const { address, message, signature } = body;
  if (!address || !message || !signature) return Response.json({ error: "address, message and signature are required" }, { status: 400 });
  const why = await checkSignIn(req.headers.get("host") ?? new URL(req.url).host, address, message, signature);
  if (why) return Response.json({ error: `Sign-in failed: ${why}` }, { status: 401 });
  const r = await walletSignIn(req.headers, address);
  if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
  return withCookies({ address }, r.cookies);
}
