"use client";
import { useState } from "react";
import { Share2 } from "lucide-react";

/** Shares the generated passport image (NFT + stamps + numbers baked in) with a link back to the live passport. */
export default function SharePassport({ passportId, stamps, tier }: { passportId: string; stamps: number; tier: string | null }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const url = () => `${location.origin}/u/${encodeURIComponent(passportId)}`;
  const text = `${stamps} eco stamp${stamps === 1 ? "" : "s"}${tier ? ` · Eco ${tier}` : ""} in my EcoProof passport, every one verified on Solana 🌱🐝`;

  async function share() {
    setBusy(true); setMsg("");
    try {
      const blob = await (await fetch(`/api/passport-card/${encodeURIComponent(passportId)}?format=square`)).blob();
      const file = new File([blob], "ecoproof-passport.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${text}\n${url()}` });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file); a.download = file.name; a.click();
        await navigator.clipboard?.writeText(`${text} ${url()}`).catch(() => {});
        setMsg("Image saved and link copied. Attach the image to your post and paste the link.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setMsg("Sharing isn't available here. Try again from your phone.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-1.5">
      <button onClick={share} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-honey-500 py-3 font-heading text-[15px] text-ink shadow-[0_6px_20px_rgba(232,163,23,0.45)] ring-1 ring-white/60 disabled:opacity-60">
        <Share2 size={17} strokeWidth={2.5} /> {busy ? "Making your image…" : "Share my passport"}
      </button>
      {msg && <p className="text-center text-xs text-sage-900">{msg}</p>}
    </div>
  );
}
