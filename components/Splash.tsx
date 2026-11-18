"use client";
import { useEffect, useState } from "react";
import { LogoLockup } from "@/components/Logo";

const MIN_MS = 700; // long enough to read as a deliberate opening screen, not a flash

/** Logo-only opening screen. Shows once per browser tab session and fades out as soon as `ready` (the passport has loaded). */
export default function Splash({ ready }: { ready: boolean }) {
  const [minElapsed, setMinElapsed] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    // Already shown in this tab: skip it (checked after mount so server and client render the same markup).
    try { if (sessionStorage.getItem("ecoproof-splash")) { const t = setTimeout(() => setGone(true), 0); return () => clearTimeout(t); } } catch { /* show it */ }
    const t = setTimeout(() => setMinElapsed(true), MIN_MS);
    return () => clearTimeout(t);
  }, []);
  const leaving = ready && minElapsed;
  useEffect(() => {
    if (!leaving) return;
    try { sessionStorage.setItem("ecoproof-splash", "1"); } catch { /* private mode: it just shows again next time */ }
    const t = setTimeout(() => setGone(true), 500);
    return () => clearTimeout(t);
  }, [leaving]);

  if (gone) return null;
  return (
    <div className={`passport-bg fixed inset-0 z-[5000] flex items-center justify-center transition-opacity duration-500 ${leaving ? "pointer-events-none opacity-0" : "opacity-100"}`} role="status" aria-label="Loading EcoProof">
      <div className="animate-pulse"><LogoLockup size={64} /></div>
    </div>
  );
}
