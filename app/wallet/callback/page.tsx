"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { clearState, loadState, readConnect, readSignature, saveState, signUrl } from "@/lib/walletDeeplink";
import { linkDevicePassport } from "@/lib/wallet";
import { getUserId } from "@/lib/clientUser";

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
async function post(path: string, body: unknown) {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Request failed");
  return j;
}

/** Where the wallet app sends the user back to (both after `connect` and after `signMessage`). */
export default function WalletCallback() {
  const [msg, setMsg] = useState("Finishing sign-in…");
  const [err, setErr] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      try {
        const params = new URLSearchParams(location.search);
        const state = loadState();
        if (!state) throw new Error("This sign-in has expired, or it was started in a different browser. Please start again from the browser where you opened EcoProof.");

        if (state.step === "connect") {
          const next = readConnect(state, params);
          setMsg("Wallet connected. Asking it to sign you in…");
          const { message } = await post("/api/auth/nonce", { address: next.address });
          saveState({ ...next, step: "sign", message, at: Date.now() });
          location.href = signUrl(next, message, location.origin);
          return;
        }

        const sig = readSignature(state, params);
        setMsg("Checking your signature…");
        await post("/api/auth/verify", { address: state.address, message: state.message, signature: b64(sig) });
        try { await linkDevicePassport(getUserId()); } catch { /* nothing to link, or already linked */ }
        clearState();
        location.replace(state.returnTo || "/");
      } catch (e) {
        clearState();
        setErr(e instanceof Error ? e.message : "Sign-in failed.");
      }
    })();
  }, []);

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
