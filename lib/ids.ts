import { PublicKey } from "@solana/web3.js";

// The ids a passport can be keyed by. Records keep whichever id they were collected under (their proof hash covers it):
//   a device id   random UUID made on the phone; works like a password for an anonymous passport, never published
//   a wallet      Solana address; public
//   an account    "u_" + the account's id, for accounts without a wallet (signed in with Google or Facebook)

const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** An anonymous passport id: a random UUID made on the device (lib/clientUser.ts). Anything shorter or guessable is refused. */
export const isDeviceId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function looksLikeWallet(id: string): boolean {
  if (!WALLET_RE.test(id)) return false;
  try { new PublicKey(id); return true; } catch { return false; }
}

const ACCOUNT_PREFIX = "u_";
export const accountKey = (userId: string) => ACCOUNT_PREFIX + userId;
export const isAccountKey = (id: string) => /^u_[A-Za-z0-9]{16,64}$/.test(id);
export const userIdOfKey = (key: string) => (isAccountKey(key) ? key.slice(ACCOUNT_PREFIX.length) : null);
