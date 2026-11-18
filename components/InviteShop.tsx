"use client";
import { useState } from "react";
import { Copy, Share2 } from "lucide-react";

/** A ready-to-send message a customer can pass to a café, shop or online store they love. */
export default function InviteShop() {
  const [msg, setMsg] = useState("");
  const text = () => `Hi! I use EcoProof: customers collect stamps from eco places, every stamp is proven on Solana, and they share their passport. It would be great for your shop. You can set up your place in a few minutes, free: ${location.origin}/about#owners`;
  async function share() {
    const t = text();
    try {
      if (navigator.share) await navigator.share({ text: t });
      else { await navigator.clipboard.writeText(t); setMsg("Message copied. Paste it into a chat or an email."); }
    } catch (e) { if ((e as Error).name !== "AbortError") setMsg("Couldn't share from here. Use Copy message."); }
  }
  async function copy() { try { await navigator.clipboard.writeText(text()); setMsg("Message copied. Paste it into a chat or an email."); } catch { setMsg("Couldn't copy. Select the text above and copy it by hand."); } }
  return (
    <div className="mt-3 space-y-2">
      <p className="rounded-2xl bg-white/50 p-3 text-[12.5px] leading-relaxed text-ink/90 ring-1 ring-white/70">&ldquo;Hi! I use EcoProof: customers collect stamps from eco places, every stamp is proven on Solana, and they share their passport. It would be great for your shop. You can set up your place in a few minutes, free.&rdquo;</p>
      <div className="grid grid-cols-2 gap-2 text-[13px] font-bold">
        <button onClick={share} className="flex items-center justify-center gap-1.5 rounded-full bg-honey-500 py-2.5 text-ink shadow-[0_6px_20px_rgba(232,163,23,0.4)] ring-1 ring-white/60"><Share2 size={15} strokeWidth={2.6} /> Send to a shop</button>
        <button onClick={copy} className="glass flex items-center justify-center gap-1.5 rounded-full py-2.5"><Copy size={15} strokeWidth={2.6} /> Copy message</button>
      </div>
      {msg && <p className="text-center text-xs text-sage-900">{msg}</p>}
    </div>
  );
}
