"use client";
import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void> };

export default function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    const onBip = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); setHidden(false); };
    window.addEventListener("beforeinstallprompt", onBip);
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const init = async () => { setIos(isIos); setHidden(!!standalone || !isIos); };
    init();
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (hidden) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-emerald-900/60 p-3 text-sm ring-1 ring-emerald-600">
      <span className="text-2xl">📲</span>
      <span className="min-w-0 flex-1">
        {ios && !evt ? <>Install: tap <b>Share</b>, then <b>Add to Home Screen</b></> : <>Install EcoProof on your home screen</>}
      </span>
      {evt && (
        <button onClick={async () => { await evt.prompt(); setHidden(true); }} className="rounded-lg bg-emerald-500 px-3 py-1.5 font-semibold text-emerald-950">Install</button>
      )}
      <button aria-label="Dismiss" onClick={() => setHidden(true)} className="text-emerald-400">✕</button>
    </div>
  );
}
