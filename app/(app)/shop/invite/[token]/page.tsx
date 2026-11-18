"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { Loader2, Store } from "lucide-react";
import AccountChip from "@/components/AccountChip";
import { currentAccount } from "@/lib/account";
import { useAccountChange } from "@/lib/desktop";

type Invite = { placeId: string; placeName: string; role: "owner" | "staff"; status: "open" | "used" | "expired" };

/** Where an invite link lands: say what it is for, ask the person to sign in, then accept. */
export default function AcceptInvite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [invite, setInvite] = useState<Invite | null | undefined>(undefined);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    const [r, a] = await Promise.all([fetch(`/api/invites/${token}`, { cache: "no-store" }), currentAccount().catch(() => null)]);
    setInvite(r.ok ? await r.json() : null);
    setSignedIn(!!a?.signedIn);
  }, [token]);
  useEffect(() => { const init = async () => { await load(); }; init(); }, [load]);
  useAccountChange(load);

  async function accept() {
    setBusy(true); setErr("");
    const r = await fetch(`/api/invites/${token}`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { router.push(`/shop/${j.placeId}`); return; }
    setErr(j.error || "Couldn't accept the invite."); setBusy(false);
  }

  return (
    <div className="mx-auto max-w-md space-y-4 pt-4 text-center lg:pt-10">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-honey-500 text-ink ring-4 ring-white/70"><Store size={30} strokeWidth={2.4} /></span>
      {invite === undefined ? <Loader2 size={24} className="mx-auto animate-spin text-sage-700" /> : !invite || invite.status !== "open" ? (
        <>
          <h1 className="text-[22px]">This link doesn&apos;t work any more</h1>
          <p className="text-sm text-sage-900">{invite?.status === "used" ? "It was already used." : "It has expired or isn't valid."} Ask the owner for a new one.</p>
        </>
      ) : (
        <>
          <h1 className="text-[22px] leading-tight">{invite.role === "owner" ? `Take over ${invite.placeName}` : `Join ${invite.placeName}`}</h1>
          <p className="text-sm text-sage-900">
            {invite.role === "owner"
              ? "You're being handed this place on EcoProof. You'll be its owner: its settings, QR codes, online shop connection and team. The current owner stays on as staff."
              : "You're invited as staff: you'll see customer activity and can show the QR code and print stamp cards."}
          </p>
          {signedIn ? (
            <button onClick={accept} disabled={busy} className="lift w-full rounded-full bg-honey-500 py-3 font-heading text-[15px] text-ink shadow-[0_6px_20px_rgba(232,163,23,0.45)] disabled:opacity-60">{busy ? "Joining…" : invite.role === "owner" ? "Accept and take over" : "Accept and join"}</button>
          ) : (
            <div className="glass space-y-3 rounded-[22px] p-4">
              <p className="text-sm font-semibold">Sign in first, with Google, Facebook or a Solana wallet.</p>
              <div className="flex justify-center"><AccountChip onChange={load} /></div>
            </div>
          )}
          {err && <p className="rounded-xl bg-terra-100 p-2.5 text-sm text-terra-800">{err}</p>}
        </>
      )}
      <Link href="/" className="inline-block text-xs font-bold text-sage-900 underline">Back to EcoProof</Link>
    </div>
  );
}
