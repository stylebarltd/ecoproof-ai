"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, Copy, LogOut, ShieldCheck, Wallet, X } from "lucide-react";
import { currentAddress, deepLinks, detectWallets, isMobile, linkDevicePassport, shortAddress, signInWith, signOut, type WalletInfo } from "@/lib/wallet";
import { getUserId } from "@/lib/clientUser";

/** Header chip: "Connect wallet" when signed out, the wallet address (with a small menu) when signed in. */
export default function AccountChip({ onChange }: { onChange: () => void }) {
  const [address, setAddress] = useState<string | null>(null);
  const [open, setOpen] = useState<"sheet" | "menu" | null>(null);

  useEffect(() => { const init = async () => { setAddress(await currentAddress().catch(() => null)); }; init(); }, []);
  const done = useCallback((a: string | null) => { setAddress(a); onChange(); }, [onChange]);

  return (
    <>
      <button
        onClick={() => setOpen(address ? "menu" : "sheet")}
        className="flex items-center gap-1.5 rounded-full border-[1.5px] border-neutral-300 px-3 py-1 text-xs font-semibold text-ink"
      >
        {address ? <ShieldCheck size={14} strokeWidth={2.5} className="text-sage-600" /> : <Wallet size={14} strokeWidth={2.5} />}
        {address ? shortAddress(address) : "Connect wallet"}
      </button>
      {open === "sheet" && <WalletSheet onClose={() => setOpen(null)} onSignedIn={(a) => { done(a); }} />}
      {open === "menu" && address && <Menu address={address} onClose={() => setOpen(null)} onSignedOut={() => { setOpen(null); done(null); }} />}
    </>
  );
}

function Backdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[3000] flex items-end bg-ink/40" onClick={onClose}>
      <div className="mx-auto w-full max-w-md rounded-t-[28px] bg-neutral-100 p-5 pb-8 text-ink shadow-2xl" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function WalletSheet({ onClose, onSignedIn }: { onClose: () => void; onSignedIn: (address: string) => void }) {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<{ address: string; receipts: number; reviews: number } | null>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const init = async () => {
      setWallets(detectWallets());
      setMobile(isMobile());
      // Some wallets inject a moment after page load.
      setTimeout(() => setWallets(detectWallets()), 800);
    };
    init();
  }, []);

  async function go(w: WalletInfo) {
    setBusy(w.key); setErr("");
    try {
      const address = await signInWith(w);
      let linked = { receipts: 0, reviews: 0 };
      try { linked = await linkDevicePassport(getUserId()); } catch { /* nothing to link, or already linked */ }
      setResult({ address, receipts: linked.receipts, reviews: linked.reviews });
      onSignedIn(address);
    } catch (e) { setErr(e instanceof Error ? e.message : "Sign-in failed."); }
    setBusy(null);
  }

  const links = typeof window !== "undefined" ? deepLinks(window.location.href) : [];
  return (
    <Backdrop onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl">Sign in with your wallet</h2>
        <button aria-label="Close" onClick={onClose} className="text-neutral-500"><X size={20} strokeWidth={2.5} /></button>
      </div>

      {result ? (
        <div className="mt-3 space-y-3 text-sm">
          <p className="flex items-center gap-2 font-semibold"><Check size={18} strokeWidth={3} className="text-sage-600" /> Signed in as {shortAddress(result.address)}</p>
          {result.receipts + result.reviews > 0 && <p className="rounded-xl bg-sage-100 p-3 text-sage-900">We added {result.receipts} receipt{result.receipts === 1 ? "" : "s"}{result.reviews ? ` and ${result.reviews} review${result.reviews === 1 ? "" : "s"}` : ""} from this device to your wallet passport.</p>}
          <button onClick={onClose} className="w-full rounded-full bg-terra-500 py-3 font-heading text-cream">Done</button>
        </div>
      ) : (
        <div className="mt-3 space-y-3 text-sm">
          <ul className="space-y-1.5 text-neutral-700">
            <li className="flex gap-2"><Check size={16} strokeWidth={3} className="mt-0.5 shrink-0 text-sage-600" /> Keep your passport and streak on any device</li>
            <li className="flex gap-2"><Check size={16} strokeWidth={3} className="mt-0.5 shrink-0 text-sage-600" /> Nothing to pay: you only sign a short message</li>
            <li className="flex gap-2"><Check size={16} strokeWidth={3} className="mt-0.5 shrink-0 text-sage-600" /> We never see your keys or touch your funds</li>
          </ul>

          {wallets.length > 0 ? (
            <div className="space-y-2 pt-1">
              {wallets.map((w) => (
                <button key={w.key} disabled={!!busy} onClick={() => go(w)} className="flex w-full items-center justify-between rounded-full bg-terra-500 px-5 py-3 font-bold text-cream disabled:opacity-60">
                  <span>{busy === w.key ? "Check your wallet…" : `Continue with ${w.name}`}</span><Wallet size={18} strokeWidth={2.5} />
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2 rounded-2xl bg-cream p-3">
              <p className="font-semibold">No wallet found in this browser</p>
              {mobile ? (
                <>
                  <p className="text-neutral-700">Open this page inside your wallet app:</p>
                  <div className="flex gap-2">{links.map((l) => <a key={l.name} href={l.href} className="flex-1 rounded-full bg-terra-500 py-2.5 text-center font-bold text-cream">{l.name}</a>)}</div>
                </>
              ) : (
                <p className="text-neutral-700">Install <a className="underline" href="https://phantom.app/download" target="_blank" rel="noreferrer">Phantom</a> or <a className="underline" href="https://solflare.com/download" target="_blank" rel="noreferrer">Solflare</a>, then reload this page.</p>
              )}
            </div>
          )}
          {err && <p className="rounded-xl bg-terra-100 p-2.5 text-terra-800">{err}</p>}
          <button onClick={onClose} className="w-full text-xs font-semibold text-neutral-600 underline">Continue without a wallet</button>
        </div>
      )}
    </Backdrop>
  );
}

function Menu({ address, onClose, onSignedOut }: { address: string; onClose: () => void; onSignedOut: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Backdrop onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl">Your wallet</h2>
        <button aria-label="Close" onClick={onClose} className="text-neutral-500"><X size={20} strokeWidth={2.5} /></button>
      </div>
      <p className="mt-2 break-all rounded-xl bg-cream p-3 font-mono text-xs">{address}</p>
      <p className="mt-2 text-xs text-neutral-600">Your passport is saved to this wallet, so it follows you to any device where you sign in.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={async () => { await navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="flex items-center justify-center gap-1.5 rounded-full border-[1.5px] border-neutral-300 py-2.5 text-sm font-semibold">
          {copied ? <Check size={15} strokeWidth={2.5} /> : <Copy size={15} strokeWidth={2.5} />} {copied ? "Copied" : "Copy address"}
        </button>
        <button onClick={async () => { await signOut(); onSignedOut(); }} className="flex items-center justify-center gap-1.5 rounded-full border-[1.5px] border-neutral-300 py-2.5 text-sm font-semibold">
          <LogOut size={15} strokeWidth={2.5} /> Sign out
        </button>
      </div>
    </Backdrop>
  );
}
