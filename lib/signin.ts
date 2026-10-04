import { query } from "./db";
import { buildMessage, newNonce, nonceValid, parseMessage, verifySignature } from "./siws";
import { createToken, sessionCookie } from "./session";

export const SESSION_TTL = 30 * 24 * 3600;

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

export const sessionHeader = (address: string) => sessionCookie(createToken(address, SESSION_TTL), SESSION_TTL);
