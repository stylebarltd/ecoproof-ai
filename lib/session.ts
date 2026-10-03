import { createHmac, timingSafeEqual } from "crypto";
import { PublicKey } from "@solana/web3.js";

export const COOKIE = "ecoproof_session";
const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export class AuthError extends Error {
  status = 401;
}

export function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV !== "production") return "dev-only-session-secret-change-me-0123456789";
  throw new Error("SESSION_SECRET is not set");
}

export const hmac = (scope: string, data: string) => createHmac("sha256", secret()).update(`${scope}:${data}`).digest("base64url");

const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function looksLikeWallet(id: string): boolean {
  if (!WALLET_RE.test(id)) return false;
  try { new PublicKey(id); return true; } catch { return false; }
}

/** Session token: v1.<address>.<expiry>.<hmac>. Stateless, httpOnly cookie. */
export function createToken(address: string, ttlSec = 30 * 24 * 3600): string {
  const body = `v1.${address}.${Math.floor(Date.now() / 1000) + ttlSec}`;
  return `${body}.${hmac("session", body)}`;
}

export function readToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  const [v, address, exp, sig] = parts;
  if (!safeEqual(sig, hmac("session", `${v}.${address}.${exp}`))) return null;
  if (Number(exp) < Date.now() / 1000 || !looksLikeWallet(address)) return null;
  return address;
}

function cookieOf(req: Request, name: string): string | null {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

export function getSession(req: Request): { address: string } | null {
  try {
    const t = cookieOf(req, COOKIE);
    const address = t ? readToken(t) : null;
    return address ? { address } : null;
  } catch { return null; }
}

/** Same as getSession but from a cookie value (server components read cookies via next/headers rather than a Request). */
export function sessionFromToken(t: string | null | undefined): { address: string } | null {
  try { const address = t ? readToken(t) : null; return address ? { address } : null; } catch { return null; }
}

export function sessionCookie(token: string, maxAgeSec: number): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

/**
 * Who is acting? A signed-in wallet always wins. Anonymous users may pass their device id, but may not claim a wallet's
 * identity without signing in (otherwise anyone could write into someone else's passport).
 */
export function resolveUser(req: Request, claimed: string | null | undefined): string {
  const s = getSession(req);
  if (s) return s.address;
  const c = (claimed ?? "").trim();
  if (c && looksLikeWallet(c)) throw new AuthError("Sign in with that wallet to use its passport.");
  return c.slice(0, 64);
}
