import { isAPIError } from "better-auth/api";
import { auth } from "./auth";
import { query } from "./db";
import { buildMessage, newNonce, nonceValid, parseMessage, verifySignature } from "./siws";

/** The sign-in message the wallet will sign (bound to our domain, with a fresh nonce). */
export function signInMessage(host: string, origin: string, address: string): string {
  const now = Date.now();
  return buildMessage({ domain: host, uri: origin, address, nonce: newNonce(), issuedAt: new Date(now).toISOString(), expiresAt: new Date(now + 10 * 60 * 1000).toISOString() });
}

/** Checks a wallet's signature over our message (domain, expiry, signature, single use). Returns null when valid, else the reason. */
export async function checkSignIn(host: string, address: string, message: string, signatureB64: string): Promise<string | null> {
  const m = parseMessage(message);
  if (!m) return "malformed message";
  if (m.address !== address) return "address mismatch";
  if (m.domain !== host) return "wrong domain";
  if (!nonceValid(m.nonce) || Date.parse(m.expiresAt) < Date.now()) return "the sign-in request expired";
  if (!verifySignature(address, message, signatureB64)) return "signature does not match this wallet";
  const used = await query("INSERT INTO auth_nonces (nonce) VALUES ($1) ON CONFLICT DO NOTHING RETURNING nonce", [m.nonce]); // a captured signature cannot be replayed
  return used.length ? null : "this sign-in request was already used";
}

export type WalletSignIn = { ok: true; cookies: string[] } | { ok: false; status: number; error: string };

/**
 * After a wallet's signature checked out: sign in to the account that owns it (made on first use), or add the wallet to the account
 * this request is already signed in to. `cookies` are the Set-Cookie headers for the response.
 */
export async function walletSignIn(headers: Headers, address: string): Promise<WalletSignIn> {
  try {
    const r = await auth().api.walletSession({ body: { address }, headers, returnHeaders: true });
    return { ok: true, cookies: r.headers.getSetCookie() };
  } catch (e) {
    if (isAPIError(e)) return { ok: false, status: e.statusCode, error: e.message };
    throw e;
  }
}

/** A JSON response carrying the session cookies (Response.json's headers can't repeat Set-Cookie). */
export function withCookies(body: unknown, cookies: string[], init?: { status?: number }): Response {
  const h = new Headers({ "Cache-Control": "no-store" });
  for (const c of cookies) h.append("Set-Cookie", c);
  return Response.json(body, { status: init?.status, headers: h });
}
