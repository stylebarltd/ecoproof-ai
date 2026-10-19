"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, ExternalLink, Link2, X } from "lucide-react";
import ProgressSteps, { type ProgressStep } from "@/components/ProgressSteps";
import Stars from "@/components/Stars";
import type { Declaration } from "@/lib/declarations";
import type { Rating } from "@/lib/practices";

/** Publishing an owner's eco practices, in one sheet: the warning (public, permanent, on Solana), then each step live as it happens,
 *  as when a stamp is collected, then the result with its proof. */
export default function PublishSheet({ placeId, placeName, rating, open, unsaved: unsavedNow, version: versionNow, onClose, onPublish, onRetryProof }: {
  placeId: string; placeName: string; rating: Rating; open: number; unsaved: boolean; version: number;
  onClose: () => void;
  onPublish: (onStep: (step: string) => void) => Promise<Declaration>; // throws with a message the owner can read
  onRetryProof: (id: string) => Promise<Declaration | null>;
}) {
  // As they were when the sheet opened: saving and publishing change them while the steps run.
  const [unsaved] = useState(unsavedNow);
  const [version] = useState(versionNow);
  const [sure, setSure] = useState(false);
  const [phase, setPhase] = useState<"confirm" | "working" | "done">("confirm");
  const [current, setCurrent] = useState<string | null>(null);
  const [result, setResult] = useState<Declaration | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [err, setErr] = useState("");
  const busy = phase === "working" || retrying;

  const steps: ProgressStep[] = [
    ...(unsaved ? [{ key: "save", label: "Saving your changes" }] : []),
    { key: "check", label: "Checking your answers" },
    { key: "seal", label: `Sealing declaration ${version}`, hint: "Your answers are frozen and get a SHA-256 fingerprint." },
    { key: "anchor", label: "Writing the proof to Solana", hint: "Our public ledger. This is the slow part, usually 5–20 seconds." },
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  async function go() {
    setPhase("working"); setErr(""); setCurrent(null);
    try {
      setResult(await onPublish(setCurrent));
      setPhase("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't publish."); setPhase("confirm");
    }
  }

  async function retry() {
    setRetrying(true);
    const d = await onRetryProof(result!.id);
    if (d) setResult(d);
    setRetrying(false);
  }

  const close = <button aria-label="Close" disabled={busy} onClick={onClose} className="glass rounded-full p-1.5 text-sage-900 disabled:opacity-40"><X size={16} strokeWidth={2.5} /></button>;

  // Rendered on <body>, like the account sheet: a frosted parent would trap a fixed overlay inside it.
  return createPortal(
    <div className="anim-fade fixed inset-0 z-[3000] flex items-end bg-ink/45 backdrop-blur-sm lg:items-center lg:p-6" onClick={() => !busy && onClose()} role="dialog" aria-modal="true" aria-label="Publish your eco practices">
      <div className="anim-sheet passport-bg mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[32px] border-t border-white/70 p-5 pb-8 text-ink shadow-[0_-12px_40px_rgba(39,46,27,0.25)] lg:rounded-[32px] lg:border lg:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-sage-700/25" aria-hidden />

        {phase === "done" && result ? (
          <>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-500 text-cream"><Check size={22} strokeWidth={3} /></span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[19px] leading-tight">Published! 🎉</h2>
                <p className="mt-0.5 text-[12.5px] text-sage-900">{placeName} · declaration {result.version}</p>
              </div>
              {close}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white/60 p-3">
              <Stars stars={result.stars} size={20} />
              <span className="text-right"><span className="block font-heading text-[17px] leading-none">{result.stars ? `${result.stars} star${result.stars === 1 ? "" : "s"}` : rating.label}</span><span className="text-[11.5px] text-sage-900">{result.score} of 100 points</span></span>
            </div>
            {!result.pending && <ProgressSteps steps={steps} current={null} finished className="mt-4 rounded-2xl bg-white/60 p-3" />}
            {result.pending ? (
              <div className="mt-3 space-y-2 rounded-2xl bg-honey-300/50 p-3 text-[13px] leading-snug">
                <p>Your declaration is published, but Solana is slow right now, so the proof is still pending. It&apos;s written automatically the next time your public page is opened.</p>
                <button onClick={retry} disabled={retrying} className="font-bold underline disabled:opacity-50">{retrying ? "Writing the proof to Solana…" : "Try writing it now"}</button>
              </div>
            ) : (
              <p className="mt-3 text-[13px] leading-snug">Your answers are on your public page and your stars on the map. Their fingerprint is on Solana for good.</p>
            )}
            <div className="mt-4 space-y-2">
              {result.txUrl && <a href={result.txUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-full bg-terra-500 py-2.5 text-sm font-bold text-cream">See the proof on Solana <ExternalLink size={14} /></a>}
              <Link href={`/places/${placeId}`} className="block rounded-full border-[1.5px] border-neutral-300 py-2.5 text-center text-sm font-semibold">View your public page</Link>
              <button onClick={onClose} className="w-full py-2 text-sm font-semibold text-sage-800">Done</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-honey-300"><Link2 size={20} strokeWidth={2.5} /></span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[19px] leading-tight">{phase === "working" ? "Publishing your declaration" : "This is a public, permanent declaration"}</h2>
                <p className="mt-0.5 text-[12.5px] text-sage-900">{placeName} · declaration {version}</p>
              </div>
              {close}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white/60 p-3">
              <Stars stars={rating.stars} size={20} />
              <span className="text-right"><span className="block font-heading text-[17px] leading-none">{rating.stars ? `${rating.stars} star${rating.stars === 1 ? "" : "s"}` : rating.label}</span><span className="text-[11.5px] text-sage-900">{rating.score} of 100 points</span></span>
            </div>

            {phase === "working" ? (
              <>
                <ProgressSteps steps={steps} current={current} className="mt-4 rounded-2xl bg-white/60 p-3" />
                <p className="mt-3 text-center text-[11.5px] text-sage-900">Please keep this page open.</p>
              </>
            ) : (
              <>
                <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[13px] leading-snug">
                  <li>Your answers go on your public page, and your stars on the map.</li>
                  <li>A fingerprint of them is written to the <b>Solana blockchain</b> as proof of what you declared and when. It can <b>never be edited or deleted</b>.</li>
                  <li>If your practices change, you can publish a new declaration (once a day). This one stays on record.</li>
                  <li>Visitors can report a practice that isn&apos;t true.</li>
                  {open > 0 && <li>{open} practice{open === 1 ? " is" : "s are"} not answered and will be published as <b>No</b>.</li>}
                  {unsaved && <li>Your unsaved changes are saved first.</li>}
                </ul>
                <label className="mt-4 flex items-start gap-2.5 rounded-2xl bg-white/60 p-3 text-[13px] font-semibold">
                  <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-sage-600" />
                  I confirm these answers are true for {placeName}.
                </label>
                {err && <p className="mt-3 rounded-xl bg-terra-100 p-2.5 text-sm text-terra-800">{err}</p>}
                <div className="mt-4 flex gap-2">
                  <button onClick={onClose} className="flex-1 rounded-full border-[1.5px] border-neutral-300 py-2.5 text-sm font-semibold">Cancel</button>
                  <button onClick={go} disabled={!sure} className="flex-[1.6] rounded-full bg-terra-500 py-2.5 text-sm font-bold text-cream disabled:opacity-50">{err ? "Try again" : "Publish to blockchain"}</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
