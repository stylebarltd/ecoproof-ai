"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** An embed snippet with a copy button. */
export default function CopySnippet({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(code); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* the text stays selectable */ }
  }
  return (
    <div className="relative">
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-cocoa/90 p-3 pr-12 font-mono text-[12px] leading-relaxed text-paper/90">{code}</pre>
      <button type="button" onClick={copy} aria-label="Copy the snippet" className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-paper/15 text-paper hover:bg-paper/30">{done ? <Check size={15} /> : <Copy size={15} />}</button>
    </div>
  );
}
