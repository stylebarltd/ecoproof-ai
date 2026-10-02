/* eslint-disable @typescript-eslint/no-explicit-any */
// Client-side wallet access. Uses the wallet's own injected provider (Phantom, Solflare, Backpack).
// Sign-in only asks the wallet to sign a short message: no transaction, no fee, no keys leave the wallet.

export type WalletInfo = { key: "phantom" | "solflare" | "backpack"; name: string; provider: any };

export function detectWallets(): WalletInfo[] {
  if (typeof window === "undefined") return [];
  const w = window as any;
  const out: WalletInfo[] = [];
  const phantom = w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : null);
  if (phantom?.isPhantom) out.push({ key: "phantom", name: "Phantom", provider: phantom });
  if (w.solflare?.isSolflare) out.push({ key: "solflare", name: "Solflare", provider: w.solflare });
  const backpack = w.backpack?.solana ?? w.backpack;
  if (backpack?.isBackpack) out.push({ key: "backpack", name: "Backpack", provider: backpack });
  return out;
}

/** On a phone with no injected wallet, these open the site inside the wallet app's own browser. */
export function deepLinks(url: string) {
  const u = encodeURIComponent(url);
  const ref = encodeURIComponent(new URL(url).origin);
  return [
    { name: "Phantom", href: `https://phantom.app/ul/browse/${u}?ref=${ref}` },
    { name: "Solflare", href: `https://solflare.com/ul/v1/browse/${u}?ref=${ref}` },
  ];
}

export const isMobile = () => typeof navigator !== "undefined" && /android|iphone|ipad|ipod/i.test(navigator.userAgent);

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

async function post(path: string, body: unknown) {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Request failed");
  return j;
}

/** Connect, sign the server's message, and start a session. Returns the wallet address. */
export async function signInWith(wallet: WalletInfo): Promise<string> {
  const resp = await wallet.provider.connect();
  const address: string = (resp?.publicKey ?? wallet.provider.publicKey)?.toString();
  if (!address) throw new Error("The wallet did not return an address.");
  const { message } = await post("/api/auth/nonce", { address });
  let signed: any;
  try {
    signed = await wallet.provider.signMessage(new TextEncoder().encode(message), "utf8");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    throw new Error(/reject|denied|cancel/i.test(msg) ? "Sign-in was cancelled in your wallet." : "Your wallet couldn't sign the message. Ledger wallets aren't supported for sign-in.");
  }
  const sig: Uint8Array = signed instanceof Uint8Array ? signed : signed.signature;
  await post("/api/auth/verify", { address, message, signature: b64(sig) });
  return address;
}

export async function linkDevicePassport(anonUserId: string) {
  return post("/api/auth/link", { anonUserId }) as Promise<{ linked: boolean; receipts: number; reviews: number }>;
}

export async function signOut() {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function currentAddress(): Promise<string | null> {
  const r = await fetch("/api/auth/me", { cache: "no-store" });
  return r.ok ? (await r.json()).address : null;
}

export const shortAddress = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
