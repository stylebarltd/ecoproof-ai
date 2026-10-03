"use client";
import { useState } from "react";
import Link from "next/link";
import { getUserId } from "@/lib/clientUser";
import type { PublicPlace } from "@/lib/stampPlaces";

type Result = { stamp: { signature: string | null; claimUrl: string | null; impactNote: string | null }; passport: { stamps: number; nextMilestone: number }; nfts: { milestone: number; tier: string; status: string; id: string }[] };

function position(): Promise<{ lat: number; lng: number }> {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error("This device can't share its location."));
    navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => rej(new Error("Location permission is needed to collect this stamp.")), { enableHighAccuracy: true, timeout: 15000 });
  });
}

export default function ClaimStamp({ place, cardCode }: { place: PublicPlace; cardCode?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<Result | null>(null);

  async function claim() {
    setBusy(true); setErr("");
    try {
      const geo = !cardCode && place.requiresGps ? await position() : null;
      const r = await fetch("/api/claims", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cardCode ? { cardCode, userId: getUserId() } : { placeId: place.id, userId: getUserId(), ...geo }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not collect the stamp");
      setDone(j);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    setBusy(false);
  }

  const minted = done?.nfts.find((n) => n.milestone === done.passport.stamps);
  return (
    <div className="flex flex-col items-center gap-5 pt-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={place.imageUrl} alt={`${place.name} stamp`} width={176} height={176} className={done ? "" : "opacity-90"} />
      <div>
        <h1 className="text-2xl">{place.name}</h1>
        {place.tagline && <p className="mt-1 text-sm text-neutral-600">{place.tagline}</p>}
      </div>
      {!done ? (
        <>
          <button onClick={claim} disabled={busy} className="w-full rounded-full bg-terra-500 py-3.5 text-base font-bold text-cream disabled:opacity-60">{busy ? "Stamping your passport…" : "Collect stamp"}</button>
          {err && <p className="rounded-xl bg-terra-100 p-3 text-sm text-terra-800">{err}</p>}
          <p className="text-xs text-neutral-500">{cardCode ? "This card works once. Each stamp is anchored on Solana." : "One stamp per day. Each stamp is anchored on Solana."}</p>
        </>
      ) : (
        <div className="w-full space-y-3 rounded-[28px] bg-white p-5 ring-1 ring-sage-300">
          <p className="font-heading text-xl">Stamp collected! 🎉</p>
          <p className="text-sm text-neutral-600">{done.passport.stamps} stamp{done.passport.stamps > 1 ? "s" : ""} in your passport · next milestone at {done.passport.nextMilestone}</p>
          {minted && <p className="rounded-xl bg-sage-100 p-3 text-sm font-semibold text-sage-800">New Eco Warrior NFT: {minted.tier} {minted.status === "minted" ? "(minted)" : "(on its way: sign in with a wallet to receive it)"}</p>}
          {done.stamp.claimUrl && <a className="block text-xs text-sage-700 underline" href={done.stamp.claimUrl} target="_blank" rel="noreferrer">See the proof on Solana ↗</a>}
          <Link href="/" className="block rounded-full bg-sage-500 py-3 font-bold text-cream">View my passport</Link>
        </div>
      )}
    </div>
  );
}
