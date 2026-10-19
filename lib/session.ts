import { timingSafeEqual } from "crypto";
import { auth } from "./auth";
import { query } from "./db";
import { accountKey, isAccountKey, isDeviceId, looksLikeWallet } from "./ids";
import { hmac } from "./secret";
import { SOLANA_PROVIDER, isPlaceholderEmail } from "./solanaAuth";

export { isDeviceId, looksLikeWallet } from "./ids";
export { hmac, secret } from "./secret";

export class AuthError extends Error {
  status = 401;
}

/** The person signed in on this request. */
export type Session = {
  /** The passport id to act as: the account's first wallet, else "u_" + its id. A session from before accounts: its wallet. */
  key: string;
  /** Every passport id of the account (its wallets and its "u_" id). Places, links and stamps under any of them are theirs. */
  keys: string[];
  wallet: string | null;
  /** The account (Better Auth user id). Null for a session from before accounts, until it is upgraded (app/api/auth/me). */
  userId: string | null;
  name: string | null;
  /** A real email (Google, Facebook); wallet-only accounts have none. */
  email: string | null;
  image: string | null;
  /** How this account can sign in: "solana", "google", "facebook". */
  methods: string[];
};

/** The account's wallets (oldest first) and sign-in methods. */
async function accountInfo(userId: string) {
  const rows = await query<{ provider_id: string; account_id: string }>(
    "SELECT provider_id, account_id FROM auth_account WHERE user_id=$1 ORDER BY created_at, id",
    [userId],
  );
  return { wallets: rows.filter((r) => r.provider_id === SOLANA_PROVIDER).map((r) => r.account_id), methods: [...new Set(rows.map((r) => r.provider_id))] };
}

/** Every passport id of an account, its main one first. */
export async function accountKeys(userId: string): Promise<string[]> {
  const { wallets } = await accountInfo(userId);
  return [...wallets, accountKey(userId)];
}

// Sessions from before accounts: a signed cookie holding the wallet address (v1.<address>.<expiry>.<hmac>). Still honoured until they
// expire; /api/auth/me swaps one for an account session on the next visit.
export const LEGACY_COOKIE = "ecoproof_session";
const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

function readLegacyToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  const [v, address, exp, sig] = parts;
  if (!safeEqual(sig, hmac("session", `${v}.${address}.${exp}`))) return null;
  if (Number(exp) < Date.now() / 1000 || !looksLikeWallet(address)) return null;
  return address;
}

function cookieOf(headers: Headers, name: string): string | null {
  for (const part of (headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

export const clearLegacyCookie = () => `${LEGACY_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

/** Who is signed in. Takes a Request, or the headers of a server component (`await headers()`). */
export async function getSession(source: Request | Headers): Promise<Session | null> {
  const headers = source instanceof Headers ? source : source.headers;
  try {
    const s = await auth().api.getSession({ headers });
    if (s) {
      const { wallets, methods } = await accountInfo(s.user.id);
      const keys = [...wallets, accountKey(s.user.id)];
      return {
        key: keys[0], keys, wallet: wallets[0] ?? null, userId: s.user.id, methods,
        name: s.user.name || null, email: isPlaceholderEmail(s.user.email) ? null : s.user.email, image: s.user.image ?? null,
      };
    }
  } catch (e) { console.error("session lookup failed", e); }
  const t = cookieOf(headers, LEGACY_COOKIE);
  const address = t ? readLegacyToken(t) : null;
  return address ? { key: address, keys: [address], wallet: address, userId: null, name: null, email: null, image: null, methods: [SOLANA_PROVIDER] } : null;
}

/**
 * Who is acting? A signed-in person always wins. Anonymous users may pass their device id, but may not claim a wallet's or an
 * account's passport without signing in (otherwise anyone could write into someone else's passport).
 */
export async function resolveUser(req: Request, claimed: string | null | undefined): Promise<string> {
  const s = await getSession(req);
  if (s) return s.key;
  const c = (claimed ?? "").trim();
  if (c && looksLikeWallet(c)) throw new AuthError("Sign in with that wallet to use its passport.");
  if (c && isAccountKey(c)) throw new AuthError("Sign in to use this passport.");
  return isDeviceId(c) ? c : "";
}
