"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, X } from "lucide-react";
import { detectWallets, isMobile } from "@/lib/wallet";

/** Only EcoProof claim paths are accepted: a counter QR (/c/..), a printed card (/k/..) or an order link (/o/../..). */
const CLAIM_PATH = /^\/(c\/[a-z0-9-]+|k\/[A-Za-z0-9]+|o\/[a-z0-9-]+\/[A-Za-z0-9_.-]+)$/;

/** Opens the camera, finds a QR code, and goes to its claim page. We follow the path on this site only, never the host in the code. */
export default function QrScanner({ onClose, onPath }: { onClose: () => void; onPath?: (path: string) => boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  const [seen, setSeen] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inWallet] = useState(() => isMobile() && detectWallets().length > 0); // a wallet app's built-in browser

  /** Handles a QR code's text. Returns true when it was an EcoProof claim code (and we're navigating). */
  const handleCode = (data: string): boolean => {
    let path = "";
    try { path = new URL(data).pathname; } catch { /* not a URL */ }
    if (!CLAIM_PATH.test(path)) return false;
    if (!onPath?.(path)) location.assign(path);
    return true;
  };

  /** Fallback for in-app browsers (wallet browsers etc.) where live camera access is blocked: take a photo with the phone's camera instead. */
  async function readPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoBusy(true); setSeen("");
    try {
      const bmp = await createImageBitmap(file);
      const c = document.createElement("canvas");
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      for (const maxSide of [1400, 900, 600]) { // QR codes are sometimes small in a photo, so try a few sizes
        const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
        c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
        ctx.drawImage(bmp, 0, 0, c.width, c.height);
        const hit = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height, { inversionAttempts: "attemptBoth" });
        if (hit?.data) { if (handleCode(hit.data)) return; setSeen("That QR code isn't an EcoProof stamp."); setPhotoBusy(false); return; }
      }
      setSeen("We couldn't find a QR code in that photo. Get closer, keep it flat and well lit, and try again.");
    } catch { setSeen("We couldn't read that photo. Try again."); }
    setPhotoBusy(false);
  }

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");

    const tick = () => {
      const v = video.current;
      if (stopped || !v) return;
      if (v.readyState >= 2 && v.videoWidth) {
        const w = 640, h = Math.round((v.videoHeight / v.videoWidth) * w);
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(v, 0, 0, w, h);
        const hit = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
        if (hit?.data) {
          if (handleCode(hit.data)) { stopped = true; return; }
          setSeen("That QR code isn't an EcoProof stamp.");
        }
      }
      raf = window.setTimeout(tick, 150) as unknown as number;
    };

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera API");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        tick();
      } catch {
        setErr("The live camera isn't available here. This often happens inside a wallet app's browser.");
      }
    })();

    return () => { stopped = true; clearTimeout(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-[6000] flex flex-col bg-black/90 text-cream" role="dialog" aria-label="Scan a QR code">
      <div className="flex items-center justify-between p-4">
        <span className="flex items-center gap-2 font-heading text-lg"><Camera size={20} /> Scan a QR code</span>
        <button onClick={onClose} aria-label="Close" className="rounded-full bg-white/15 p-2"><X size={20} /></button>
      </div>
      <div className="relative mx-auto flex w-full max-w-md flex-1 items-center justify-center px-4">
        <video ref={video} playsInline muted className="max-h-full w-full rounded-3xl object-cover" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-3xl border-4 border-honey-400/90" />
      </div>
      <div className="space-y-3 p-5 text-center text-sm">
        <p>{seen || err || "Point the camera at the QR code on the counter, your parcel card or your order email."}</p>
        {err && (
          <>
            <label className="mx-auto flex w-full max-w-xs cursor-pointer items-center justify-center gap-2 rounded-full bg-honey-500 py-3 font-bold text-ink">
              <Camera size={18} /> {photoBusy ? "Reading the photo…" : "Take a photo of the QR code"}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void readPhoto(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            <p className="text-xs text-cream/80">{inWallet ? "Wallet browsers often block the camera. The easiest way: point your phone's own camera app at the QR code. It opens EcoProof in your normal browser." : "Or point your phone's own camera app at the QR code."}</p>
            {inWallet && (
              <div className="mx-auto flex max-w-xs gap-2 text-xs font-bold">
                {/android/i.test(navigator.userAgent) && (
                  <a href={`intent://${location.host}${location.pathname}${location.search}#Intent;scheme=https;package=com.android.chrome;end`} className="flex-1 rounded-full bg-white/15 py-2.5">Open in Chrome</a>
                )}
                <button onClick={async () => { try { await navigator.clipboard.writeText(location.href); setCopied(true); } catch { /* ignore */ } }} className="flex-1 rounded-full bg-white/15 py-2.5">{copied ? "Link copied" : "Copy link"}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
