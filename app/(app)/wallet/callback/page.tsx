"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { clearPending, finishLogin, pendingLogin, pollLogin } from "@/lib/walletLogin";

/** Where the wallet app sends the user back to (after `connect` and after `signMessage`), in whichever browser it opens. */
export default function WalletCallback() {
  const [msg, setMsg] = useState("Finishing sign-in…");
  const [err, setErr] = useState("");
  const [elsewhere, setElsewhere] = useState<string | null>(null); // signed in, but the app that started it is somewhere else
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      try {
        const q = new URLSearchParams(location.search);
        const sid = q.get("sid");
        if (!sid) throw new Error("This sign-in link is incomplete. Please start again from EcoProof.");
        q.delete("sid");
        const r = await fetch("/api/auth/dl/step", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sid, params: Object.fromEntries(q) }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.error) throw new Error(j.error || "Sign-in failed.");
        if (j.next) { setMsg("Wallet connected. Asking it to sign you in…"); location.href = j.next; return; }

        // Signed in. If this is the browser/app that started the sign-in, finish here; otherwise tell the person to go back to the app.
        const pending = pendingLogin();
        if (pending && pending.sid === sid) {
          setMsg("Signing you in…");
          const res = await pollLogin(pending);
          if (typeof res === "object") { await finishLogin(); location.replace(res.returnTo || "/"); return; }
        }
        setElsewhere(j.done.returnTo || "/");
      } catch (e) {
        clearPending();
        setErr(e instanceof Error ? e.message : "Sign-in failed.");
      }
    })();
  }, []);

  if (elsewhere) return (
    <div className="flex flex-col items-center gap-4 pt-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-honey-500 text-ink ring-4 ring-white/70"><Check size={34} strokeWidth={3.2} /></span>
      <h1 className="text-2xl">You&apos;re connected</h1>
      <p className="max-w-xs text-sm text-neutral-700">Switch back to the <b>EcoProof app</b> where you started. It signs in by itself within a few seconds. You can close this tab.</p>
      <Link href={elsewhere} className="rounded-full border-[1.5px] border-neutral-300 bg-white px-5 py-2.5 text-sm font-bold">Or continue here</Link>
    </div>
  );
  return (
    <div className="flex flex-col items-center gap-4 pt-24 text-center">
      {err ? (
        <>
          <h1 className="text-2xl">Couldn&apos;t sign you in</h1>
          <p className="max-w-xs rounded-xl bg-terra-100 p-3 text-sm text-terra-800">{err}</p>
          <Link href="/" className="rounded-full bg-sage-500 px-5 py-2.5 font-bold text-cream">Back to EcoProof</Link>
        </>
      ) : (
        <>
          <Loader2 size={32} className="animate-spin text-terra-500" />
          <p className="text-sm text-neutral-700">{msg}</p>
        </>
      )}
    </div>
  );
}
