"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, X } from "lucide-react";

/** Only EcoProof claim paths are accepted: a counter QR (/c/..), a printed card (/k/..) or an order link (/o/../..). */
const CLAIM_PATH = /^\/(c\/[a-z0-9-]+|k\/[A-Za-z0-9]+|o\/[a-z0-9-]+\/[A-Za-z0-9_.-]+)$/;

/** Opens the camera, finds a QR code, and goes to its claim page. We follow the path on this site only, never the host in the code. */
export default function QrScanner({ onClose }: { onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  const [seen, setSeen] = useState("");

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
          let path = "";
          try { const u = new URL(hit.data); path = u.pathname; } catch { /* not a URL */ }
          if (CLAIM_PATH.test(path)) { stopped = true; location.assign(path); return; }
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
        setErr("We couldn't open the camera. Allow camera access, or point your phone's own camera app at the QR code.");
      }
    })();

    return () => { stopped = true; clearTimeout(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

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
      <p className="p-5 text-center text-sm">{err || seen || "Point the camera at the QR code on the counter, your parcel card or your order email."}</p>
    </div>
  );
}
