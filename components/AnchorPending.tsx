"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

/** A published declaration whose Solana proof hasn't been written yet (Solana was down, or a demo place's seed): writes it on view. */
export default function AnchorPending({ id }: { id: string }) {
  const [state, setState] = useState<"writing" | "failed" | { txUrl: string }>("writing");

  useEffect(() => {
    let live = true;
    (async () => {
      const r = await fetch(`/api/declarations/${id}/anchor`, { method: "POST" }).catch(() => null);
      const j = r?.ok ? await r.json() : null;
      if (live) setState(j?.txUrl ? { txUrl: j.txUrl } : "failed");
    })();
    return () => { live = false; };
  }, [id]);

  if (state === "writing") return <p className="flex items-center gap-1.5 text-[12.5px] text-sage-900"><Loader2 size={14} className="animate-spin" /> Writing the proof to Solana…</p>;
  if (state === "failed") return <p className="text-[12.5px] text-sage-900">The proof on Solana is still pending. Reload the page in a moment to try again.</p>;
  return <a href={state.txUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-bold text-sage-800 underline">Proof written. See it on Solana Explorer <ExternalLink size={12} /></a>;
}
