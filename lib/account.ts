// Browser side of accounts: who is signed in, Google sign-in (Better Auth, under /api/account), signing out, deleting the account.
// Wallet sign-in lives in lib/wallet.ts and lib/walletLogin.ts.

export type Account = {
  signedIn: boolean;
  /** The account's wallet, if it has one. */
  address: string | null;
  name: string | null;
  /** A real email (Google); null for wallet-only accounts. */
  email: string | null;
  image: string | null;
  /** Sign-in methods on this account: "solana", "google". */
  methods: string[];
  /** Whether the site offers Google sign-in. */
  google: boolean;
  /** Places they run (owner or staff). */
  shops: number;
};

const SIGNED_OUT: Account = { signedIn: false, address: null, name: null, email: null, image: null, methods: [], google: false, shops: 0 };

export async function currentAccount(): Promise<Account> {
  const r = await fetch("/api/auth/me", { cache: "no-store" });
  return r.ok ? { ...SIGNED_OUT, ...(await r.json()) } : SIGNED_OUT;
}

/** What to call the signed-in person in the header: the wallet, else their first name, else their email. */
export const accountLabel = (a: Account) =>
  a.address ? `${a.address.slice(0, 4)}…${a.address.slice(-4)}` : a.name?.split(" ")[0] || a.email || "Account";

async function post(path: string, body: unknown = {}) {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || j.error || "Request failed");
  return j;
}

// Google sends the person away and back. This flag tells the page they came back from it, so it can attach the device's passport.
const RETURN_KEY = "ecoproof-oauth-return";

/** Sign in with Google, or (signed in already) add Google to this account. Leaves the page. */
export async function continueWithGoogle(mode: "sign-in" | "link") {
  const here = location.pathname + location.search;
  const j = await post(mode === "link" ? "/api/account/link-social" : "/api/account/sign-in/social", { provider: "google", callbackURL: here, errorCallbackURL: here });
  if (!j.url) throw new Error("Couldn't start Google sign-in.");
  try { localStorage.setItem(RETURN_KEY, String(Date.now())); } catch { /* the device passport is attached on the next wallet or Google sign-in */ }
  location.href = j.url;
}

/** Just back from Google? Returns the error Google sign-in ended with, if any, and clears the flag. Null when not returning. */
export function takeGoogleReturn(): { error: string | null } | null {
  let at: string | null = null;
  try { at = localStorage.getItem(RETURN_KEY); localStorage.removeItem(RETURN_KEY); } catch { return null; }
  if (!at || Date.now() - Number(at) > 15 * 60_000) return null;
  const q = new URLSearchParams(location.search);
  const code = q.get("error");
  if (code) { q.delete("error"); q.delete("error_description"); history.replaceState(null, "", location.pathname + (q.size ? `?${q}` : "")); }
  return { error: code ? googleError(code) : null };
}

function googleError(code: string) {
  if (/already_linked|linked_to_another|account_not_linked/i.test(code)) return "That Google account already belongs to another EcoProof account.";
  if (/access_denied|cancel/i.test(code)) return "Google sign-in was cancelled.";
  return "Google sign-in didn't complete. Please try again.";
}

export async function signOut() {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function signOutEverywhere() {
  await post("/api/account/revoke-sessions");
  await signOut();
}

/** Deletes the account and its sign-in methods. Better Auth asks for a recent sign-in first. */
export async function deleteAccount() {
  try {
    await post("/api/account/delete-user");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    throw new Error(/fresh|re-?authenticate|expired/i.test(msg) ? "For your safety, sign out and sign in again, then delete your account." : msg || "Couldn't delete the account.");
  }
  await signOut();
}
