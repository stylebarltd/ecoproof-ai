import nacl from "tweetnacl";
import bs58 from "bs58";

// Wallet sign-in through the wallets' deep-link protocol (Phantom and Solflare use the same one), so a person can stay in their
// normal browser (Safari / Chrome, where the camera works) and only jump to the wallet app to approve:
//   1. connect       -> the wallet returns the user's address (encrypted with a shared secret)
//   2. signMessage   -> the wallet signs our sign-in message; we verify it on the server exactly like the injected-wallet flow
// Requests and responses are encrypted with NaCl box (x25519) between a throw-away key pair made here and the wallet's key.

export type DlProvider = "phantom" | "solflare";
const BASE: Record<DlProvider, string> = { phantom: "https://phantom.app/ul/v1", solflare: "https://solflare.com/ul/v1" };
const CLUSTER = "devnet";

export type DlState = {
  provider: DlProvider; pub: string; secret: string; // our key pair (base58)
  step: "connect" | "sign"; returnTo: string; at: number;
  theirPub?: string; session?: string; address?: string; message?: string;
};

export function newState(provider: DlProvider, returnTo: string, now = Date.now()): DlState {
  const kp = nacl.box.keyPair();
  return { provider, pub: bs58.encode(kp.publicKey), secret: bs58.encode(kp.secretKey), step: "connect", returnTo, at: now };
}

const q = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
const shared = (theirPub: string, secret: string) => nacl.box.before(bs58.decode(theirPub), bs58.decode(secret));

export const connectUrl = (s: DlState, origin: string) =>
  `${BASE[s.provider]}/connect?${q({ app_url: origin, dapp_encryption_public_key: s.pub, redirect_link: `${origin}/wallet/callback`, cluster: CLUSTER })}`;

/** Reads the wallet's answer to `connect`. Returns the updated state (address + session) or throws with a readable reason. */
export function readConnect(s: DlState, p: URLSearchParams): DlState {
  failIfError(p);
  const theirPub = p.get(`${s.provider}_encryption_public_key`), nonce = p.get("nonce"), data = p.get("data");
  if (!theirPub || !nonce || !data) throw new Error("The wallet's answer was incomplete. Please try again.");
  const plain = nacl.box.open.after(bs58.decode(data), bs58.decode(nonce), shared(theirPub, s.secret));
  if (!plain) throw new Error("Couldn't read the wallet's answer. Please try again.");
  const j = JSON.parse(new TextDecoder().decode(plain)) as { public_key?: string; session?: string };
  if (!j.public_key || !j.session) throw new Error("The wallet didn't return an address.");
  return { ...s, theirPub, address: j.public_key, session: j.session };
}

/** Builds the `signMessage` request for the server's sign-in message. */
export function signUrl(s: DlState, message: string, origin: string, nonce = nacl.randomBytes(24)): string {
  const payload = new TextEncoder().encode(JSON.stringify({ session: s.session, message: bs58.encode(new TextEncoder().encode(message)), display: "utf8" }));
  const box = nacl.box.after(payload, nonce, shared(s.theirPub!, s.secret));
  return `${BASE[s.provider]}/signMessage?${q({ dapp_encryption_public_key: s.pub, nonce: bs58.encode(nonce), redirect_link: `${origin}/wallet/callback`, payload: bs58.encode(box) })}`;
}

/** Reads the wallet's answer to `signMessage`: the signature (64 bytes). */
export function readSignature(s: DlState, p: URLSearchParams): Uint8Array {
  failIfError(p);
  const nonce = p.get("nonce"), data = p.get("data");
  if (!nonce || !data) throw new Error("The wallet's answer was incomplete. Please try again.");
  const plain = nacl.box.open.after(bs58.decode(data), bs58.decode(nonce), shared(s.theirPub!, s.secret));
  if (!plain) throw new Error("Couldn't read the wallet's answer. Please try again.");
  const sig = bs58.decode((JSON.parse(new TextDecoder().decode(plain)) as { signature?: string }).signature ?? "");
  if (sig.length !== 64) throw new Error("The wallet returned an unexpected signature.");
  return sig;
}

function failIfError(p: URLSearchParams) {
  const code = p.get("errorCode");
  if (!code && !p.get("errorMessage")) return;
  const msg = p.get("errorMessage") ?? "";
  throw new Error(/reject|denied|cancel|4001/i.test(`${code} ${msg}`) ? "Sign-in was cancelled in your wallet." : `The wallet reported an error${msg ? `: ${msg}` : ""}.`);
}

// ---- browser layer ------------------------------------------------------------------------------------------------------
const KEY = "ecoproof-deeplink";
const MAX_AGE_MS = 12 * 60_000;
export const loadState = (): DlState | null => {
  try { const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as DlState | null; return s && Date.now() - s.at < MAX_AGE_MS ? s : null; } catch { return null; }
};
export const saveState = (s: DlState) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* the callback will explain */ } };
export const clearState = () => { try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ } };

/** Step 1: remember a fresh key pair, then hand over to the wallet app. It returns to /wallet/callback in this browser. */
export function startDeeplinkSignIn(provider: DlProvider, returnTo = "/") {
  const s = newState(provider, returnTo);
  saveState(s);
  location.href = connectUrl(s, location.origin);
}
