import { query } from "./db";
import { isAccountKey, isDeviceId, looksLikeWallet, userIdOfKey } from "./ids";
import { accountKeys } from "./session";
import { SOLANA_PROVIDER } from "./solanaAuth";

/** The account (Better Auth user id) behind a wallet or "u_" passport id, or null for a wallet that never signed in since accounts. */
async function accountOf(key: string): Promise<string | null> {
  if (isAccountKey(key)) return userIdOfKey(key);
  if (!looksLikeWallet(key)) return null;
  return (await query<{ user_id: string }>("SELECT user_id FROM auth_account WHERE provider_id=$1 AND account_id=$2", [SOLANA_PROVIDER, key]))[0]?.user_id ?? null;
}

/**
 * Every id that belongs to the same person, their main one first: the account's wallets and its "u_" id, plus the devices linked
 * to any of them. Without an account: the wallet and its devices, or just the device.
 * Records keep their original user_id (their proof hash covers it), so identity is resolved here instead of rewritten.
 */
export async function identityGroup(userId: string): Promise<string[]> {
  // A device points at its owner (user_links.wallet holds a wallet or a "u_" id).
  const owner = isDeviceId(userId)
    ? (await query<{ wallet: string }>("SELECT wallet FROM user_links WHERE anon_id=$1", [userId]))[0]?.wallet ?? null
    : userId;
  if (!owner) return [userId];
  const account = await accountOf(owner);
  const keys = account ? await accountKeys(account) : [owner];
  if (!keys.includes(owner)) keys.push(owner); // an account whose sign-in methods were removed still owns what was collected under it
  const anon = await query<{ anon_id: string }>("SELECT anon_id FROM user_links WHERE wallet = ANY($1) ORDER BY linked_at", [keys]);
  return [...keys, ...anon.map((r) => r.anon_id)];
}
