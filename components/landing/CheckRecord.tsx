"use client";
import { useState } from "react";
import { Check, X } from "lucide-react";
import type { Verification } from "@/lib/verify";

const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

/** "Check this record" on the landing page: recomputes the record's hash on the server and reads the memo back from Solana, live. */
export default function CheckRecord({ id }: { id: string }) {
  const [v, setV] = useState<Verification | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/verify/${id}`);
      if (!r.ok) throw new Error("The check could not run. Try again in a moment.");
      setV(await r.json());
    } catch (e) { setErr(e instanceof Error ? e.message : "The check could not run."); }
    setBusy(false);
  }

  const row = (ok: boolean, label: string) => (
    <li className="flex items-start gap-2">
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${ok ? "bg-leaf text-paper" : "bg-terracotta text-paper"}`}>{ok ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}</span>
      <span>{label}</span>
    </li>
  );

  return (
    <div className="mt-4">
      <button type="button" onClick={run} disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-cocoa px-5 text-[14.5px] font-extrabold text-paper transition hover:bg-honey-deep disabled:opacity-60 sm:w-auto">
        {busy ? "Asking Solana…" : v ? "Check it again" : "Check this record now"}
      </button>
      {err && <p className="mt-2 text-[14px] font-bold text-terracotta">{err}</p>}
      {v && (
        <ul className="mt-3 space-y-1.5 text-[14.5px] leading-snug">
          {row(v.dataIntact, "The data still matches its hash: nothing was edited")}
          {row(v.anchored && v.onChainMatch, v.onChainMatch ? `Solana holds the same hash${v.blockTime ? `, written ${when(v.blockTime)}` : ""}${v.slot ? `, slot ${v.slot.toLocaleString("en")}` : ""}` : v.error ?? "Solana's copy could not be read just now")}
          {v.claimed !== null && row(v.claimed, "The order has its own claim account: it can never become a second stamp")}
        </ul>
      )}
    </div>
  );
}
