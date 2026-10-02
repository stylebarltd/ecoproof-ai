import { query } from "@/lib/db";
import { rateLimited } from "@/lib/ratelimit";
import { buildMessage, newNonce } from "@/lib/siws";
import { looksLikeWallet } from "@/lib/session";

/** Step 1 of sign-in: the server composes the exact message the wallet will sign. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip, 60)) return Response.json({ error: "Too many attempts, try again later" }, { status: 429 });
  const { address } = (await req.json().catch(() => ({}))) as { address?: string };
  if (!address || !looksLikeWallet(address)) return Response.json({ error: "Invalid wallet address" }, { status: 400 });
  const url = new URL(req.url);
  const now = Date.now();
  await query("DELETE FROM auth_nonces WHERE used_at < now() - interval '1 day'"); // housekeeping
  const message = buildMessage({
    domain: req.headers.get("host") ?? url.host, uri: url.origin, address, nonce: newNonce(),
    issuedAt: new Date(now).toISOString(), expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
  });
  return Response.json({ message });
}
