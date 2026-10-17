"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, ChevronRight, Copy, Loader2, LogOut, ShieldCheck, Smartphone, Store, UserRound, Wallet, X } from "lucide-react";
import { deepLinks, detectWallets, isMobile, linkDevicePassport, shortAddress, signInWith, type WalletInfo } from "@/lib/wallet";
import { accountLabel, continueWithGoogle, currentAccount, deleteAccount, signOut, signOutEverywhere, takeGoogleReturn, type Account } from "@/lib/account";
import { getUserId } from "@/lib/clientUser";
import { clearPending, finishLogin, pendingLogin, pollLogin, startDeeplinkSignIn } from "@/lib/walletLogin";
import { LogoTile } from "@/components/Logo";

/** Header chip: "Sign in" when signed out; the wallet or the person's name (with the account menu) when signed in. */
export default function AccountChip({ onChange }: { onChange: () => void }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [open, setOpen] = useState<"sheet" | "menu" | "connect-wallet" | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [googleErr, setGoogleErr] = useState("");

  const done = useCallback(async () => { setAccount(await currentAccount().catch(() => null)); onChange(); }, [onChange]);

  useEffect(() => {
    const init = async () => {
      const a = await currentAccount().catch(() => null);
      setAccount(a);
      // Back from Google: attach this device's guest passport to the account, or say why it didn't work.
      const back = takeGoogleReturn();
      if (back?.error) { setGoogleErr(back.error); setOpen(a?.signedIn ? "menu" : "sheet"); }
      else if (back && a?.signedIn) { await finishLogin(); onChange(); }
    };
    init();
  }, [onChange]);

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
        if (typeof r === "object") { await finishLogin(); setWaiting(false); void doneRef.current(); return; }
        if (r === "expired") { clearPending(); setWaiting(false); return; }
      } catch { /* offline for a moment: keep waiting */ }
      timer = setTimeout(check, 1500);
    };
    const onVisible = () => { if (document.visibilityState === "visible") { clearTimeout(timer); void check(); } };
    document.addEventListener("visibilitychange", onVisible);
    void check();
    return () => { stop = true; clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  const signedIn = !!account?.signedIn;
  const close = () => { setOpen(null); setGoogleErr(""); };
  return (
    <>
      <button
        onClick={() => setOpen(signedIn ? "menu" : "sheet")}
        className="glass lift flex max-w-[11rem] items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-ink active:scale-[0.98] lg:max-w-[14rem] lg:px-4 lg:py-2 lg:text-[13px]"
      >
        {waiting ? <Loader2 size={14} className="shrink-0 animate-spin text-honey-700" /> : signedIn ? <ShieldCheck size={14} strokeWidth={2.5} className="shrink-0 text-sage-700" /> : <UserRound size={14} strokeWidth={2.5} className="shrink-0" />}
        <span className="truncate">{waiting ? "Waiting for wallet…" : signedIn && account ? accountLabel(account) : "Sign in"}</span>
      </button>
      {open === "sheet" && <SignInSheet google={!!account?.google} initialErr={googleErr} onClose={close} onSignedIn={() => void done()} />}
      {open === "connect-wallet" && <SignInSheet google={false} connect onClose={close} onSignedIn={() => void done()} />}
      {open === "menu" && account && (
        <Menu account={account} initialErr={googleErr} onClose={close} onConnectWallet={() => setOpen("connect-wallet")} onSignedOut={() => { close(); void done(); }} />
      )}
    </>
  );
}

/** Bottom sheet in the passport's glass style. Rendered on <body>: the desktop top bar is frosted glass, and `backdrop-filter` would trap a fixed overlay inside it. */
function Sheet({ onClose, title, subtitle, children }: { onClose: () => void; title: string; subtitle?: string; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div className="anim-fade fixed inset-0 z-[3000] flex items-end bg-ink/45 backdrop-blur-sm lg:items-center lg:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="anim-sheet passport-bg mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[32px] border-t border-white/70 p-5 pb-8 lg:rounded-[32px] lg:border lg:p-6 text-ink shadow-[0_-12px_40px_rgba(39,46,27,0.25)]" onClick={(e) => e.stopPropagation()}>
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
    </div>,
    document.body,
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

/** Google's "G" mark, as their sign-in button guidelines ask. */
function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="shrink-0">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

function WalletRow({ id, name, sub, busy, disabled, onClick, href }: { id: string; name: string; sub: string; busy?: boolean; disabled?: boolean; onClick?: () => void; href?: string }) {
  const cls = "glass glass-strong lift flex w-full items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[0.99] disabled:opacity-60";
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

function GoogleButton({ label, onError }: { label: string; onError: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => { setBusy(true); try { await continueWithGoogle(label.startsWith("Connect") ? "link" : "sign-in"); } catch (e) { onError(e instanceof Error ? e.message : "Couldn't start Google sign-in."); setBusy(false); } }}
      className="lift flex w-full items-center justify-center gap-2.5 rounded-full bg-white py-3 text-[15px] font-bold text-ink shadow-[0_4px_14px_rgba(39,46,27,0.12)] ring-1 ring-sage-900/15 transition active:scale-[0.99] disabled:opacity-60"
    >
      {busy ? <Loader2 size={20} className="animate-spin text-sage-700" /> : <GoogleG />} {label}
    </button>
  );
}

/** Sign in (Google or a wallet), or with `connect`: add a wallet to the account that is signed in. */
function SignInSheet({ google, connect, initialErr = "", onClose, onSignedIn }: { google: boolean; connect?: boolean; initialErr?: string; onClose: () => void; onSignedIn: () => void }) {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState(initialErr);
  const [result, setResult] = useState<{ address: string; receipts: number } | null>(null);
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
      let linked = { receipts: 0 };
      try { linked = await linkDevicePassport(getUserId()); } catch { /* nothing to link, or already linked */ }
      setResult({ address, receipts: linked.receipts });
      onSignedIn();
    } catch (e) { setErr(e instanceof Error ? e.message : "Sign-in failed."); }
    setBusy(null);
  }

  const links = typeof window !== "undefined" ? deepLinks(window.location.href) : [];

  if (result) {
    const n = result.receipts;
    return (
      <Sheet onClose={onClose} title={connect ? "Wallet connected" : "You're signed in"} subtitle={connect ? "Your Bee Guardian NFTs are sent to this wallet." : "Your passport now follows you to any device."}>
        <div className="mt-5 flex flex-col items-center gap-3 text-center">
          <span className="anim-pop flex h-16 w-16 items-center justify-center rounded-full bg-honey-500 text-ink shadow-[0_8px_24px_rgba(232,163,23,0.5)] ring-4 ring-white/70"><Check size={34} strokeWidth={3.2} /></span>
          <span className="glass rounded-full px-3.5 py-1.5 font-mono text-xs font-bold">{shortAddress(result.address)}</span>
          {n > 0 && <p className="glass rounded-2xl px-4 py-2.5 text-sm font-semibold text-sage-900">We added {n} stamp{n === 1 ? "" : "s"} from this device to your passport.</p>}
          <button onClick={onClose} className="w-full rounded-full bg-honey-500 py-3 font-heading text-[15px] text-ink shadow-[0_6px_20px_rgba(232,163,23,0.45)] ring-1 ring-white/60">Done</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      onClose={onClose}
      title={connect ? "Connect a wallet" : "Save your passport"}
      subtitle={connect ? "Your Bee Guardian NFTs are sent to it. You can keep signing in with Google too." : "Sign in to keep your passport and Bee Guardians on every device."}
    >
      {google && (
        <div className="mt-4 space-y-3">
          <GoogleButton label="Continue with Google" onError={setErr} />
          <p className="flex items-center gap-3 text-[11.5px] font-semibold text-sage-900 before:h-px before:flex-1 before:bg-sage-900/20 after:h-px after:flex-1 after:bg-sage-900/20">or with a Solana wallet</p>
        </div>
      )}
      <div className={`${google ? "mt-3" : "mt-4"} space-y-2.5`}>
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
        {[[Check, google ? "Free, no password" : "A free signature"], [ShieldCheck, "Your funds are never touched"], [Smartphone, "Works on any device"]].map(([Icon, text]) => {
          const I = Icon as typeof Check;
          return <li key={text as string} className="glass rounded-2xl px-1.5 py-2.5"><I size={16} strokeWidth={2.6} className="mx-auto mb-1 text-sage-700" />{text as string}</li>;
        })}
      </ul>

      {err && <p className="mt-3 rounded-xl bg-terra-100 p-2.5 text-sm text-terra-800">{err}</p>}
      <button onClick={onClose} className="mt-3 w-full text-xs font-bold text-sage-900 underline">{connect ? "Not now" : "Continue without signing in"}</button>
      <p className="mt-2 text-center text-[11px] text-sage-900">What we keep and why: <a href="/privacy" className="font-bold underline">Privacy</a></p>
    </Sheet>
  );
}

function Method({ icon, name, detail, mono, action }: { icon: React.ReactNode; name: string; detail?: string | null; mono?: boolean; action?: React.ReactNode }) {
  return (
    <li className="glass flex items-center gap-3 rounded-2xl p-3">
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold leading-tight">{name}</span>
        {detail && <span className={`block truncate text-[11.5px] text-sage-900 ${mono ? "font-mono" : ""}`}>{detail}</span>}
      </span>
      {action}
    </li>
  );
}

function Menu({ account, initialErr = "", onClose, onConnectWallet, onSignedOut }: { account: Account; initialErr?: string; onClose: () => void; onConnectWallet: () => void; onSignedOut: () => void }) {
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState(initialErr);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const hasGoogle = account.methods.includes("google");
  const act = (fn: () => Promise<void>) => async () => { setBusy(true); setErr(""); try { await fn(); onSignedOut(); } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); setBusy(false); } };
  const small = "glass rounded-full px-3 py-1.5 text-xs font-bold";

  return (
    <Sheet onClose={onClose} title="Your account" subtitle="Your passport follows you to any device you sign in on.">
      {(account.email || (account.name && !account.address)) && (
        <p className="glass mt-4 rounded-2xl p-3 text-center text-sm font-semibold">
          {account.name && <span className="block">{account.name}</span>}
          {account.email && <span className="block text-xs text-sage-900">{account.email}</span>}
        </p>
      )}
      {account.shops > 0 && (
        <Link href="/shop" onClick={onClose} className="lift mt-4 flex items-center justify-center gap-2 rounded-full bg-sage-500 py-2.5 text-sm font-bold text-cream">
          <Store size={16} strokeWidth={2.5} /> My shop{account.shops > 1 ? ` · ${account.shops} places` : ""}
        </Link>
      )}
      <h3 className="mt-4 px-1 text-[12px] font-bold uppercase tracking-wide text-sage-900">Ways to sign in</h3>
      <ul className="mt-2 space-y-2">
        <Method
          icon={<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage-700 text-cream"><Wallet size={18} strokeWidth={2.5} /></span>}
          name="Solana wallet"
          detail={account.address ? shortAddress(account.address) : "Needed to receive your NFTs"}
          mono={!!account.address}
          action={account.address ? (
            <button onClick={async () => { await navigator.clipboard.writeText(account.address!); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className={`${small} flex items-center gap-1`}>
              {copied ? <Check size={13} strokeWidth={2.5} className="text-sage-700" /> : <Copy size={13} strokeWidth={2.5} />} {copied ? "Copied" : "Copy"}
            </button>
          ) : <button onClick={onConnectWallet} className={small}>Connect</button>}
        />
        {(hasGoogle || account.google) && (
          <Method
            icon={<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-sage-900/15"><GoogleG size={18} /></span>}
            name="Google"
            detail={hasGoogle ? "Connected" : "Sign in without a wallet"}
            action={hasGoogle ? <Check size={18} strokeWidth={2.6} className="mr-1 text-sage-700" /> : (
              <button onClick={() => continueWithGoogle("link").catch((e) => setErr(e instanceof Error ? e.message : "Couldn't start Google sign-in."))} className={small}>Connect</button>
            )}
          />
        )}
      </ul>

      {err && <p className="mt-3 rounded-xl bg-terra-100 p-2.5 text-sm text-terra-800">{err}</p>}
      {confirmDelete ? (
        <div className="mt-4 space-y-3 rounded-2xl bg-terra-100 p-3 text-sm text-terra-800">
          <p><b>Delete your account?</b> Your sign-in details are removed and this account ends. Stamps stay recorded on Solana, and Bee Guardians already in your wallet stay there.</p>
          <div className="grid grid-cols-2 gap-2">
            <button disabled={busy} onClick={() => setConfirmDelete(false)} className="glass rounded-full py-2.5 font-bold text-ink">Keep it</button>
            <button disabled={busy} onClick={act(deleteAccount)} className="rounded-full bg-terra-500 py-2.5 font-bold text-cream disabled:opacity-60">{busy ? "Deleting…" : "Delete"}</button>
          </div>
        </div>
      ) : (
        <>
          <button disabled={busy} onClick={act(signOut)} className="glass mt-4 flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-bold">
            <LogOut size={15} strokeWidth={2.5} /> Sign out
          </button>
          {account.methods.length > 0 && (
            <p className="mt-3 flex justify-center gap-4 text-xs font-bold text-sage-900">
              <button disabled={busy} onClick={act(signOutEverywhere)} className="underline">Sign out on all devices</button>
              <button disabled={busy} onClick={() => setConfirmDelete(true)} className="underline">Delete account</button>
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}
