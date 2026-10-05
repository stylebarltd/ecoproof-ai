import { query } from "./db";
import { hmac, isDeviceId, looksLikeWallet } from "./session";

// A device id is the only thing that lets someone act as an anonymous passport, so it must never appear in a link.
// Shared passports are addressed by a public id derived from it instead. Wallet addresses are public already and are used as-is.

const PREFIX = "pp_";

/** The id to put in share links for this passport. Stored so the public page can find the passport again. */
export async function publicIdFor(userId: string): Promise<string> {
  if (looksLikeWallet(userId)) return userId;
  if (!isDeviceId(userId)) return userId; // not a real passport (nothing can be collected with it): nothing to hide, nothing stored
  const publicId = PREFIX + hmac("passport-public", userId).slice(0, 22);
  // The stored id wins, so share links already handed out keep working even if the secret behind the derivation changes.
  const rows = await query<{ public_id: string }>(
    `WITH ins AS (INSERT INTO public_passports (public_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING public_id)
     SELECT public_id FROM ins UNION ALL SELECT public_id FROM public_passports WHERE user_id=$2 LIMIT 1`,
    [publicId, userId],
  );
  return rows[0]?.public_id ?? publicId;
}

/** The passport behind a share-link id, or null if unknown. */
export async function resolvePublicId(id: string): Promise<string | null> {
  if (looksLikeWallet(id)) return id;
  if (id.startsWith(PREFIX)) return (await query<{ user_id: string }>("SELECT user_id FROM public_passports WHERE public_id=$1", [id]))[0]?.user_id ?? null;
  return null;
}
