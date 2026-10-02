"use client";
import { useState } from "react";
import type { Verification } from "@/lib/verify";

export default function VerifyButton({ id }: { id: string }) {
  const [v, setV] = useState<Verification | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/verify/${id}`);
      if (!r.ok) throw new Error("Verification request failed");
      setV(await r.json());
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    setBusy(false);
  }

  const row = (ok: boolean, label: string) => (
    <li className="flex gap-2"><span>{ok ? "✅" : "❌"}</span><span>{label}</span></li>
  );

  return (
    <div className="space-y-3 rounded-2xl bg-emerald-900/60 p-4">
      <button onClick={run} disabled={busy} className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-emerald-950 disabled:opacity-60">
        {busy ? "Checking Solana…" : v ? "Verify again" : "⛓️ Verify on-chain"}
      </button>
      {err && <p className="text-sm text-red-300">{err}</p>}
      {v && (
        <>
          <ul className="space-y-1 text-sm">
            {row(v.dataIntact, "Record data matches its fingerprint (not edited)")}
            {row(v.anchored, "Fingerprint was submitted to Solana")}
            {row(v.onChainMatch, "On-chain memo equals the recomputed fingerprint")}
            {v.claimed !== null && row(v.claimed, "Receipt is claimed on Solana and can never be used again")}
          </ul>
          {v.dataIntact && v.onChainMatch ? (
            <p className="rounded-lg bg-emerald-500 p-2 text-center text-sm font-semibold text-emerald-950">
              Verified{v.blockTime ? ` · anchored ${new Date(v.blockTime).toLocaleString()}` : ""}{v.slot ? ` · slot ${v.slot}` : ""}
            </p>
          ) : (
            <p className="rounded-lg bg-red-900/60 p-2 text-center text-sm text-red-200">{v.error ?? "Verification failed"}</p>
          )}
          {v.claimUrl && <a className="block text-xs underline text-emerald-300" href={v.claimUrl} target="_blank" rel="noreferrer">View the receipt claim account ↗</a>}
          <p className="break-all text-[11px] text-emerald-400">recomputed sha256 {v.recomputedHash}</p>
        </>
      )}
    </div>
  );
}
