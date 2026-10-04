import { linkDevicePassport } from "./wallet";
import { getUserId } from "./clientUser";
import type { DlProvider } from "./walletDeeplink";

// Browser side of the deep-link sign-in (see lib/dlServer.ts). The installed app keeps a private `claim` secret in its own storage;
// whichever browser the wallet returns to, the server marks the sign-in done, and the app collects its session by polling.
const KEY = "ecoproof-dl-pending";
const MAX_AGE_MS = 14 * 60_000;
export type Pending = { sid: string; claim: string; at: number; returnTo: string };

export function pendingLogin(): Pending | null {
  try { const p = JSON.parse(localStorage.getItem(KEY) ?? "null") as Pending | null; return p && Date.now() - p.at < MAX_AGE_MS ? p : null; } catch { return null; }
}
export const clearPending = () => { try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ } };

/** Hands over to the wallet app. Works the same from the installed app and from a browser tab. */
export async function startDeeplinkSignIn(provider: DlProvider, returnTo = "/") {
  const claim = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
  const r = await fetch("/api/auth/dl/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, claim, returnTo }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Couldn't start the sign-in.");
  try { localStorage.setItem(KEY, JSON.stringify({ sid: j.sid, claim, at: Date.now(), returnTo } satisfies Pending)); } catch { /* the callback page will explain */ }
  location.href = j.url;
}

export type PollResult = "pending" | "expired" | { address: string; returnTo: string };
/** Asks the server whether this device's sign-in finished. On success the session cookie is set for this browser/app. */
export async function pollLogin(p: Pending): Promise<PollResult> {
  const r = await fetch("/api/auth/dl/poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sid: p.sid, claim: p.claim }) });
  const j = await r.json().catch(() => ({}));
  if (j.address) return { address: j.address, returnTo: j.returnTo || "/" };
  return j.pending ? "pending" : "expired";
}

/** After a successful sign-in: attach this device's guest passport to the wallet (also mints any NFT that was waiting). */
export async function finishLogin() {
  try { await linkDevicePassport(getUserId()); } catch { /* nothing to link, or already linked */ }
  clearPending();
}
