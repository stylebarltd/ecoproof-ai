import { query } from "@/lib/db";
import { rateLimited } from "@/lib/ratelimit";
import { nonceValid, parseMessage, verifySignature } from "@/lib/siws";
import { createToken, sessionCookie } from "@/lib/session";

const TTL = 30 * 24 * 3600;

/** Step 2: verify the wallet's signature, burn the nonce, start a session. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip, 60)) return Response.json({ error: "Too many attempts, try again later" }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { address?: string; message?: string; signature?: string };
  const { address, message, signature } = body;
  if (!address || !message || !signature) return Response.json({ error: "address, message and signature are required" }, { status: 400 });
  const bad = (why: string) => Response.json({ error: `Sign-in failed: ${why}` }, { status: 401 });

  const m = parseMessage(message);
  if (!m) return bad("malformed message");
  if (m.address !== address) return bad("address mismatch");
  if (m.domain !== (req.headers.get("host") ?? new URL(req.url).host)) return bad("wrong domain");
  if (!nonceValid(m.nonce) || Date.parse(m.expiresAt) < Date.now()) return bad("the sign-in request expired");
  if (!verifySignature(address, message, signature)) return bad("signature does not match this wallet");

  // Single use: a captured signature cannot be replayed.
  const used = await query("INSERT INTO auth_nonces (nonce) VALUES ($1) ON CONFLICT DO NOTHING RETURNING nonce", [m.nonce]);
  if (!used.length) return bad("this sign-in request was already used");

  return Response.json({ address }, { headers: { "Set-Cookie": sessionCookie(createToken(address, TTL), TTL), "Cache-Control": "no-store" } });
}
