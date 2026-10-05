"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Copy, Loader2, LogOut, ShieldCheck, Smartphone, Wallet, X } from "lucide-react";
import { currentAddress, deepLinks, detectWallets, isMobile, linkDevicePassport, shortAddress, signInWith, signOut, type WalletInfo } from "@/lib/wallet";
import { getUserId } from "@/lib/clientUser";
import { clearPending, finishLogin, pendingLogin, pollLogin, startDeeplinkSignIn } from "@/lib/walletLogin";
import { LogoTile } from "@/components/Logo";

/** Header chip: "Connect wallet" when signed out, the wallet address (with a small menu) when signed in. */
export default function AccountChip({ onChange }: { onChange: () => void }) {
  const [address, setAddress] = useState<string | null>(null);
  const [open, setOpen] = useState<"sheet" | "menu" | null>(null);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => { const init = async () => { setAddress(await currentAddress().catch(() => null)); }; init(); }, []);
  const done = useCallback((a: string | null) => { setAddress(a); onChange(); }, [onChange]);

  const doneRef = useRef(done);
  useEffect(() => { doneRef.current = done; }); // keeps the latest callback without restarting the polling effect on every parent render

  // Came back from the wallet app (maybe via a browser tab): a sign-in started here may have finished. Collect it.
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      const p = pendingLogin();
      if (!p) { setWaiting(false); return; }
      setWaiting(true);
      try {
        const r = await pollLogin(p);
        if (stop) return;
        if (typeof r === "object") { await finishLogin(); setWaiting(false); doneRef.current(r.address); return; }
        if (r === "expired") { clearPending(); setWaiting(false); return; }
      } catch { /* offline for a moment: keep waiting */ }
      timer = setTimeout(check, 1500);
    };
    const onVisible = () => { if (document.visibilityState === "visible") { clearTimeout(timer); void check(); } };
    document.addEventListener("visibilitychange", onVisible);
    void check();
    return () => { stop = true; clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(address ? "menu" : "sheet")}
        className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-ink active:scale-[0.98]"
      >
        {waiting ? <Loader2 size={14} className="animate-spin text-honey-700" /> : address ? <ShieldCheck size={14} strokeWidth={2.5} className="text-sage-700" /> : <Wallet size={14} strokeWidth={2.5} />}
        {waiting ? "Waiting for wallet…" : address ? shortAddress(address) : "Connect wallet"}
      </button>
      {open === "sheet" && <WalletSheet onClose={() => setOpen(null)} onSignedIn={(a) => { done(a); }} />}
      {open === "menu" && address && <Menu address={address} onClose={() => setOpen(null)} onSignedOut={() => { setOpen(null); done(null); }} />}
    </>
  );
}

/** Bottom sheet in the passport's glass style. */
function Sheet({ onClose, title, subtitle, children }: { onClose: () => void; title: string; subtitle?: string; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="anim-fade fixed inset-0 z-[3000] flex items-end bg-ink/45 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="anim-sheet passport-bg mx-auto w-full max-w-md rounded-t-[32px] border-t border-white/70 p-5 pb-8 text-ink shadow-[0_-12px_40px_rgba(39,46,27,0.25)]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-sage-700/25" aria-hidden />
        <div className="flex items-start gap-3">
          <LogoTile size={40} />
          <div className="min-w-0 flex-1">
            <h2 className="text-[19px] leading-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12.5px] leading-snug text-sage-900">{subtitle}</p>}
          </div>
          <button aria-label="Close" onClick={onClose} className="glass rounded-full p-1.5 text-sage-900"><X size={16} strokeWidth={2.5} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const ICONS: Record<string, string> = { phantom: "/wallets/phantom.svg", solflare: "/wallets/solflare.svg" };
function WalletLogo({ id, size = 44 }: { id: string; size?: number }) {
  return ICONS[id] ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={ICONS[id]} alt="" width={size} height={size} className="shrink-0 rounded-xl" />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-xl bg-sage-700 font-heading text-cream" style={{ width: size, height: size }}>{id.slice(0, 1).toUpperCase()}</span>
  );
}

function WalletRow({ id, name, sub, busy, disabled, onClick, href }: { id: string; name: string; sub: string; busy?: boolean; disabled?: boolean; onClick?: () => void; href?: string }) {
  const cls = "glass glass-strong flex w-full items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[0.99] disabled:opacity-60";
  const inner = (
    <>
      <WalletLogo id={id} />
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-[16px] leading-tight">{name}</span>
        <span className="block text-[11.5px] text-sage-900">{busy ? "Check your wallet…" : sub}</span>
      </span>
      {busy ? <Loader2 size={20} className="animate-spin text-honey-700" /> : <ChevronRight size={20} strokeWidth={2.5} className="text-sage-700" />}
    </>
  );
  return href ? <a href={href} target="_blank" rel="noreferrer" className={cls}>{inner}</a> : <button disabled={disabled} onClick={onClick} className={cls}>{inner}</button>;
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

  if (result) {
    const n = result.receipts + result.reviews;
    return (
      <Sheet onClose={onClose} title="You're connected" subtitle="Your passport now follows your wallet to any device.">
        <div className="mt-5 flex flex-col items-center gap-3 text-center">
          <span className="anim-pop flex h-16 w-16 items-center justify-center rounded-full bg-honey-500 text-ink shadow-[0_8px_24px_rgba(232,163,23,0.5)] ring-4 ring-white/70"><Check size={34} strokeWidth={3.2} /></span>
          <span className="glass rounded-full px-3.5 py-1.5 font-mono text-xs font-bold">{shortAddress(result.address)}</span>
          {n > 0 && <p className="glass rounded-2xl px-4 py-2.5 text-sm font-semibold text-sage-900">We added {n} stamp{n === 1 ? "" : "s"} from this device to your wallet passport.</p>}
          <button onClick={onClose} className="w-full rounded-full bg-honey-500 py-3 font-heading text-[15px] text-ink shadow-[0_6px_20px_rgba(232,163,23,0.45)] ring-1 ring-white/60">Done</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose} title="Connect your wallet" subtitle="Keep your passport and Bee Guardian NFTs on every device.">
      <div className="mt-4 space-y-2.5">
        {wallets.length > 0 ? (
          wallets.map((w) => <WalletRow key={w.key} id={w.key} name={w.name} sub="Detected in this browser" busy={busy === w.key} disabled={!!busy} onClick={() => go(w)} />)
        ) : mobile ? (
          <>
            {(["phantom", "solflare"] as const).map((p) => (
              <WalletRow key={p} id={p} name={p === "phantom" ? "Phantom" : "Solflare"} sub="Opens the app, then brings you back here" onClick={() => { setErr(""); startDeeplinkSignIn(p, location.pathname + location.search).catch((e) => setErr(e instanceof Error ? e.message : "Couldn't start the sign-in.")); }} />
            ))}
            <p className="px-1 pt-1 text-[11.5px] leading-snug text-sage-900">You stay in this browser, so the camera keeps working. Prefer the wallet&apos;s own browser?{" "}
              {links.map((l, i) => <span key={l.name}>{i > 0 && " · "}<a href={l.href} className="font-bold underline">{l.name}</a></span>)}
            </p>
          </>
        ) : (
          <>
            <WalletRow id="phantom" name="Phantom" sub="Get the extension, then reload" href="https://phantom.app/download" />
            <WalletRow id="solflare" name="Solflare" sub="Get the extension, then reload" href="https://solflare.com/download" />
          </>
        )}
      </div>

      <ul className="mt-4 grid grid-cols-3 gap-2 text-center text-[10.5px] font-semibold leading-tight text-sage-900">
        {[[Check, "A free signature"], [ShieldCheck, "Your funds are never touched"], [Smartphone, "Works on any device"]].map(([Icon, text]) => {
          const I = Icon as typeof Check;
          return <li key={text as string} className="glass rounded-2xl px-1.5 py-2.5"><I size={16} strokeWidth={2.6} className="mx-auto mb-1 text-sage-700" />{text as string}</li>;
        })}
      </ul>

      {err && <p className="mt-3 rounded-xl bg-terra-100 p-2.5 text-sm text-terra-800">{err}</p>}
      <button onClick={onClose} className="mt-3 w-full text-xs font-bold text-sage-900 underline">Continue without a wallet</button>
    </Sheet>
  );
}

function Menu({ address, onClose, onSignedOut }: { address: string; onClose: () => void; onSignedOut: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Sheet onClose={onClose} title="Your wallet" subtitle="Your passport is saved to this wallet and follows you to any device.">
      <p className="glass mt-4 break-all rounded-2xl p-3 text-center font-mono text-xs font-semibold">{address}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={async () => { await navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="glass flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-bold">
          {copied ? <Check size={15} strokeWidth={2.5} className="text-sage-700" /> : <Copy size={15} strokeWidth={2.5} />} {copied ? "Copied" : "Copy address"}
        </button>
        <button onClick={async () => { await signOut(); onSignedOut(); }} className="glass flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-bold">
          <LogOut size={15} strokeWidth={2.5} /> Sign out
        </button>
      </div>
    </Sheet>
  );
}
