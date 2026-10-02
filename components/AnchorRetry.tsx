"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function AnchorRetry({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function go() {
    setBusy(true); setMsg("");
    try {
      const r = await fetch(`/api/records/${id}/anchor`, { method: "POST" });
      if (r.ok) router.refresh(); else setMsg((await r.json().catch(() => ({}))).error || "Try again in a moment.");
    } finally { setBusy(false); }
  }
  return (
    <div className="rounded-2xl bg-terra-100 p-3 text-sm text-terra-800">
      <p>Saved. Waiting for Solana to confirm this proof.</p>
      <button onClick={go} disabled={busy} className="mt-2 flex items-center gap-1.5 rounded-full bg-terra-500 px-3.5 py-1.5 text-xs font-bold text-cream disabled:opacity-60">
        <RefreshCw size={13} strokeWidth={2.5} className={busy ? "animate-spin" : ""} /> {busy ? "Anchoring…" : "Retry anchoring"}
      </button>
      {msg && <p className="mt-1 text-xs">{msg}</p>}
    </div>
  );
}
