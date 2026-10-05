import { query } from "./db";
import { hmac, isDeviceId, looksLikeWallet } from "./session";

// A device id is the only thing that lets someone act as an anonymous passport, so it must never appear in a link.
// Shared passports are addressed by a public id derived from it instead. Wallet addresses are public already and are used as-is.

const PREFIX = "pp_";

/** The id to put in share links for this passport. Stored so the public page can find the passport again. */
export async function publicIdFor(userId: string): Promise<string> {
  if (looksLikeWallet(userId)) return userId;
  const publicId = PREFIX + hmac("passport-public", userId).slice(0, 22);
  await query("INSERT INTO public_passports (public_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [publicId, userId]);
  return publicId;
}

/** The passport behind a share-link id, or null if unknown. */
export async function resolvePublicId(id: string): Promise<string | null> {
  if (looksLikeWallet(id)) return id;
  if (id.startsWith(PREFIX)) return (await query<{ user_id: string }>("SELECT user_id FROM public_passports WHERE public_id=$1", [id]))[0]?.user_id ?? null;
  if (isDeviceId(id)) return id; // links shared before public ids existed keep working (read-only; the id in them is already out)
  return null;
}
