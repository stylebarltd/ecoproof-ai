import nacl from "tweetnacl";
import bs58 from "bs58";
import { randomBytes } from "crypto";
import { hmac, looksLikeWallet } from "./session";

const NONCE_TTL_MS = 10 * 60 * 1000;

/** Stateless nonce: <random>.<expiry>.<hmac>. Single use is enforced separately in the database. */
export function newNonce(): string {
  const body = `${randomBytes(12).toString("hex")}.${Date.now() + NONCE_TTL_MS}`;
  return `${body}.${hmac("nonce", body)}`;
}

export function nonceValid(nonce: string): boolean {
  const p = nonce.split(".");
  if (p.length !== 3) return false;
  const body = `${p[0]}.${p[1]}`;
  return hmac("nonce", body) === p[2] && Number(p[1]) > Date.now();
}

export function buildMessage(o: { domain: string; address: string; nonce: string; issuedAt: string; expiresAt: string; uri: string }): string {
  return [
    `${o.domain} wants you to sign in with your Solana account:`,
    o.address,
    "",
    "Sign in to EcoProof AI. This does not cost anything and does not move any funds.",
    "",
    `URI: ${o.uri}`,
    `Nonce: ${o.nonce}`,
    `Issued At: ${o.issuedAt}`,
    `Expiration Time: ${o.expiresAt}`,
  ].join("\n");
}

export function parseMessage(msg: string) {
  const l = msg.split("\n");
  const first = l[0]?.match(/^(.+) wants you to sign in with your Solana account:$/);
  const get = (k: string) => l.find((x) => x.startsWith(k + ": "))?.slice(k.length + 2) ?? "";
  if (!first || l.length !== 9) return null;
  return { domain: first[1], address: l[1], uri: get("URI"), nonce: get("Nonce"), issuedAt: get("Issued At"), expiresAt: get("Expiration Time") };
}

/** ed25519 check of the wallet's signature over the exact message text. */
export function verifySignature(address: string, message: string, signatureB64: string): boolean {
  try {
    if (!looksLikeWallet(address)) return false;
    return nacl.sign.detached.verify(new TextEncoder().encode(message), Buffer.from(signatureB64, "base64"), bs58.decode(address));
  } catch { return false; }
}
