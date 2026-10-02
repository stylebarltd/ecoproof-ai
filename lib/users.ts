import { query } from "./db";
import { looksLikeWallet } from "./session";

/**
 * Every id that belongs to the same person: their wallet plus any device ids they linked to it.
 * Records keep their original user_id (their proof hash covers it), so identity is resolved here instead of rewritten.
 */
export async function identityGroup(userId: string): Promise<string[]> {
  let wallet: string | null = null;
  if (looksLikeWallet(userId)) wallet = userId;
  else wallet = (await query<{ wallet: string }>("SELECT wallet FROM user_links WHERE anon_id=$1", [userId]))[0]?.wallet ?? null;
  if (!wallet) return [userId];
  const anon = await query<{ anon_id: string }>("SELECT anon_id FROM user_links WHERE wallet=$1", [wallet]);
  return [wallet, ...anon.map((r) => r.anon_id)];
}
