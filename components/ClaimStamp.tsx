"use client";
import { useState } from "react";
import Link from "next/link";
import { Camera, Check, Loader2 } from "lucide-react";
import QrScanner from "@/components/QrScanner";
import { getUserId } from "@/lib/clientUser";
import type { PublicPlace } from "@/lib/stampPlaces";

type Result = { stamp: { signature: string | null; claimUrl: string | null; impactNote: string | null }; passport: { stamps: number; nextMilestone: number }; nfts: { milestone: number; tier: string; status: string; id: string }[] };
type Step = { key: string; label: string; hint?: string };

const BASE: Step[] = [
  { key: "verify", label: "Checking your stamp" },
  { key: "anchor", label: "Writing the proof to Solana", hint: "Our public ledger. This is the slow part, usually 5–20 seconds." },
  { key: "save", label: "Saving it to your passport" },
  { key: "passport", label: "Updating your progress" },
];
const NFT_STEP: Step = { key: "nft", label: "Minting your Eco Warrior NFT", hint: "A soulbound NFT, just for you. A few more seconds." };

function position(): Promise<{ lat: number; lng: number }> {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error("This device can't share its location."));
    navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => rej(new Error("Location permission is needed to collect this stamp.")), { enableHighAccuracy: true, timeout: 15000 });
  });
}

export default function ClaimStamp({ place, cardCode, orderToken, orderLine, viaQr = true }: { place: PublicPlace; cardCode?: string; orderToken?: string; orderLine?: string | null; viaQr?: boolean }) {
  // At a real place the stamp is collected by scanning its QR. Opened any other way (passport, map) the page only explains that,
  // except demo places, which can be tapped. Cards and order links are always ready to collect.
  const canTap = !!cardCode || !!orderToken || viaQr || place.demo;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<Result | null>(null);
  const [steps, setSteps] = useState<Step[]>(BASE);
  const [current, setCurrent] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [scanning, setScanning] = useState(false);

  async function claim() {
    setBusy(true); setErr(""); setSteps(BASE); setCurrent(null);
    try {
      let geo: { lat: number; lng: number } | null = null;
      if (!cardCode && !orderToken && place.requiresGps) {
        setLocating(true);
        try { geo = await position(); } finally { setLocating(false); }
      }
      const body = orderToken ? { placeId: place.id, orderToken, userId: getUserId() } : cardCode ? { cardCode, userId: getUserId() } : { placeId: place.id, userId: getUserId(), ...geo };
      const r = await fetch("/api/claims", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" }, body: JSON.stringify(body) });
      if (!r.ok || !r.body) throw new Error((await r.json().catch(() => ({}))).error || "Could not collect the stamp");

      // Live progress: the server sends one JSON line per step, then {done} or {error}.
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let result: Result | null = null;
      for (;;) {
        const { value, done: end } = await reader.read();
        buf += dec.decode(value, { stream: !end });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines.filter(Boolean)) {
          const ev = JSON.parse(line);
          if (ev.step) { if (ev.step === "nft") setSteps([...BASE, NFT_STEP]); setCurrent(ev.step); }
          else if (ev.error) throw new Error(ev.error);
          else if (ev.done) result = ev.done;
        }
        if (end) break;
      }
      if (!result) throw new Error("The connection dropped. Check your passport: your stamp may already be saved.");
      setDone(result);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    setBusy(false);
  }

  const idx = (k: string | null) => steps.findIndex((s) => s.key === k);
  const minted = done?.nfts.find((n) => n.milestone === done.passport.stamps);
  return (
    <div className="flex flex-col items-center gap-5 pt-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={place.imageUrl} alt={`${place.name} stamp`} width={176} height={176} className={busy && !done ? "animate-pulse" : ""} />
      <div>
        <h1 className="text-2xl">{place.name}</h1>
        {place.tagline && <p className="mt-1 text-sm text-neutral-600">{place.tagline}</p>}
        {orderLine && <p className="mt-2 inline-block rounded-full bg-honey-300 px-3 py-1 text-xs font-bold text-ink">Your order: {orderLine}</p>}
      </div>
      {!done ? (
        <>
          {!busy && (
            <div className="w-full space-y-2.5">
              {canTap ? (
                <>
                  <button onClick={claim} className="w-full rounded-full bg-terra-500 py-3.5 text-base font-bold text-cream">{!cardCode && !orderToken && !viaQr && place.demo ? "Collect stamp (demo)" : "Collect stamp"}</button>
                  {!cardCode && !orderToken && !viaQr && place.demo && <p className="text-xs text-neutral-500">This is a demo place, so you can collect it by tapping. At real places you scan the QR code on the counter.</p>}
                </>
              ) : (
                <p className="rounded-2xl bg-cream p-3 text-sm text-neutral-700">To collect a stamp here, <b>scan the QR code</b> {place.kind === "online" ? "on your parcel card" : "at the counter"}. Stamps can&apos;t be collected from this page.</p>
              )}
              {!orderToken && !cardCode && !viaQr && (
                <button onClick={() => setScanning(true)} className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold ${canTap ? "border-[1.5px] border-neutral-300 bg-white text-ink" : "bg-terra-500 text-cream"}`}>
                  <Camera size={17} strokeWidth={2.5} /> Scan the QR code at {place.kind === "online" ? "your parcel" : "the counter"}
                </button>
              )}
            </div>
          )}
          {scanning && <QrScanner onClose={() => setScanning(false)} onPath={(p) => { if (p === location.pathname) { setScanning(false); claim(); return true; } return false; }} />}
          {busy && (
            <ol className="w-full space-y-2.5 rounded-[28px] bg-white p-4 text-left ring-1 ring-sage-300" aria-live="polite">
              {locating && <li className="flex items-center gap-3 text-sm font-semibold"><Loader2 size={18} className="animate-spin text-terra-500" /> Checking you&apos;re at {place.name}…</li>}
              {!locating && steps.map((s, i) => {
                const state = current === null ? (i === 0 ? "active" : "todo") : i < idx(current) ? "done" : i === idx(current) ? "active" : "todo";
                return (
                  <li key={s.key} className={`flex items-start gap-3 text-sm ${state === "todo" ? "text-neutral-400" : "text-ink"}`}>
                    <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                      {state === "done" ? <Check size={18} strokeWidth={3} className="text-sage-600" /> : state === "active" ? <Loader2 size={18} className="animate-spin text-terra-500" /> : <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />}
                    </span>
                    <span><span className={state === "active" ? "font-semibold" : ""}>{s.label}{state === "active" ? "…" : ""}</span>{state === "active" && s.hint && <span className="mt-0.5 block text-xs text-neutral-500">{s.hint}</span>}</span>
                  </li>
                );
              })}
            </ol>
          )}
          {err && <p className="rounded-xl bg-terra-100 p-3 text-sm text-terra-800">{err}</p>}
          {!busy && <p className="text-[11px]"><Link href={`/report/${place.id}`} className="text-neutral-400 underline">Not eco? Report this place</Link></p>}
          {!busy && <p className="text-xs text-neutral-500">{orderToken ? "Verified order: this stamp carries its real impact. One stamp per order, anchored on Solana." : cardCode ? "This card works once. Each stamp is anchored on Solana." : "One stamp per day. Each stamp is anchored on Solana."}</p>}
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
