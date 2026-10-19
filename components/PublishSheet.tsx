"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link2, Loader2, X } from "lucide-react";
import Stars from "@/components/Stars";
import type { Rating } from "@/lib/practices";

/** The warning an owner reads before their eco practices are published: public, permanent, and fingerprinted on Solana. */
export default function PublishSheet({ placeName, rating, open, unsaved, version, onClose, onPublish }: {
  placeName: string; rating: Rating; open: number; unsaved: boolean; version: number;
  onClose: () => void; onPublish: () => Promise<string | null>; // resolves to an error message, or null when published
}) {
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  async function go() {
    setBusy(true); setErr("");
    const e = await onPublish();
    if (e) { setErr(e); setBusy(false); }
  }

  // Rendered on <body>, like the account sheet: a frosted parent would trap a fixed overlay inside it.
  return createPortal(
    <div className="anim-fade fixed inset-0 z-[3000] flex items-end bg-ink/45 backdrop-blur-sm lg:items-center lg:p-6" onClick={() => !busy && onClose()} role="dialog" aria-modal="true" aria-label="Publish your eco practices">
      <div className="anim-sheet passport-bg mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[32px] border-t border-white/70 p-5 pb-8 text-ink shadow-[0_-12px_40px_rgba(39,46,27,0.25)] lg:rounded-[32px] lg:border lg:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-sage-700/25" aria-hidden />
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-honey-300"><Link2 size={20} strokeWidth={2.5} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[19px] leading-tight">This is a public, permanent declaration</h2>
            <p className="mt-0.5 text-[12.5px] text-sage-900">{placeName} · declaration {version}</p>
          </div>
          <button aria-label="Close" disabled={busy} onClick={onClose} className="glass rounded-full p-1.5 text-sage-900"><X size={16} strokeWidth={2.5} /></button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white/60 p-3">
          <Stars stars={rating.stars} size={20} />
          <span className="text-right"><span className="block font-heading text-[17px] leading-none">{rating.stars ? `${rating.stars} star${rating.stars === 1 ? "" : "s"}` : rating.label}</span><span className="text-[11.5px] text-sage-900">{rating.score} of 100 points</span></span>
        </div>

        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[13px] leading-snug">
          <li>Your answers go on your public page, and your stars on the map.</li>
          <li>A fingerprint of them is written to the <b>Solana blockchain</b> as proof of what you declared and when. It can <b>never be edited or deleted</b>.</li>
          <li>If your practices change, you can publish a new declaration (once a day). This one stays on record.</li>
          <li>Visitors can report a practice that isn&apos;t true.</li>
          {open > 0 && <li>{open} practice{open === 1 ? " is" : "s are"} not answered and will be published as <b>No</b>.</li>}
          {unsaved && <li>Your unsaved changes are saved first.</li>}
        </ul>

        <label className="mt-4 flex items-start gap-2.5 rounded-2xl bg-white/60 p-3 text-[13px] font-semibold">
          <input type="checkbox" checked={sure} disabled={busy} onChange={(e) => setSure(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-sage-600" />
          I confirm these answers are true for {placeName}.
        </label>
        {err && <p className="mt-3 rounded-xl bg-terra-100 p-2.5 text-sm text-terra-800">{err}</p>}

        <div className="mt-4 flex gap-2">
          <button onClick={onClose} disabled={busy} className="flex-1 rounded-full border-[1.5px] border-neutral-300 py-2.5 text-sm font-semibold">Cancel</button>
          <button onClick={go} disabled={!sure || busy} className="flex flex-[1.6] items-center justify-center gap-1.5 rounded-full bg-terra-500 py-2.5 text-sm font-bold text-cream disabled:opacity-50">
            {busy ? <><Loader2 size={15} className="animate-spin" /> Writing to Solana…</> : "Publish to blockchain"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
