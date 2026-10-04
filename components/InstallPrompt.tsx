"use client";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<{ outcome: string } | void> };
const KEY = "ecoproof-install";
const QUIET_DAYS = 60;

const read = (): { dismissedAt?: number; installed?: boolean } => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; } };
const write = (v: { dismissedAt?: number; installed?: boolean }) => { try { localStorage.setItem(KEY, JSON.stringify({ ...read(), ...v })); } catch { /* private mode: the hint may show again */ } };

/**
 * "Install the app" hint. It stays quiet when the app is already installed or running as the installed app, inside wallet and
 * other in-app browsers (they can't install anything), before the first stamp, and for 60 days after it was dismissed.
 */
export default function InstallPrompt({ stamps = 0 }: { stamps?: number }) {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone || document.referrer.startsWith("android-app://");
    const ua = navigator.userAgent;
    const inApp = /\bwv\b|; wv\)|FBAN|FBAV|Instagram|Line\/|Solflare|Phantom|Backpack/i.test(ua) || !!(window as unknown as { solflare?: unknown; phantom?: unknown }).solflare || !!(window as unknown as { phantom?: unknown }).phantom;
    const saved = read();
    const quiet = saved.installed || (saved.dismissedAt && Date.now() - saved.dismissedAt < QUIET_DAYS * 86_400_000);
    const allowed = !standalone && !inApp && !quiet;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const onBip = (e: Event) => { e.preventDefault(); if (allowed) { setEvt(e as BIPEvent); setHidden(false); } };
    const onInstalled = () => { write({ installed: true }); setHidden(true); };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    const init = async () => { setIos(isIos); setHidden(!(allowed && isIos)); };
    init();
    return () => { window.removeEventListener("beforeinstallprompt", onBip); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (hidden || stamps < 1) return null; // nothing to nag about before the first stamp
  const dismiss = () => { write({ dismissedAt: Date.now() }); setHidden(true); };
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-neutral-100 p-3 text-sm ring-1 ring-sage-300">
      <Download size={20} strokeWidth={2.5} className="shrink-0 text-sage-700" />
      <span className="min-w-0 flex-1">
        {ios && !evt ? <>Add EcoProof to your home screen: tap <b>Share</b>, then <b>Add to Home Screen</b></> : <>Add EcoProof to your home screen</>}
      </span>
      {evt && (
        <button onClick={async () => { const r = await evt.prompt(); if (r && r.outcome === "accepted") write({ installed: true }); else write({ dismissedAt: Date.now() }); setHidden(true); }} className="rounded-full bg-terra-500 px-3.5 py-1.5 text-xs font-bold text-cream">Install</button>
      )}
      <button aria-label="Don't show again" onClick={dismiss} className="text-neutral-500"><X size={18} strokeWidth={2.5} /></button>
    </div>
  );
}
