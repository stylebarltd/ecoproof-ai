"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AccountChip from "@/components/AccountChip";
import { currentAddress } from "@/lib/wallet";
import { prepareLogo } from "@/lib/clientLogo";
import type { PublicPlace } from "@/lib/stampPlaces";

const KINDS: [string, string][] = [["shop", "Shop"], ["cafe", "Café"], ["market", "Market stall"]];
const input = "w-full rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-neutral-300";

function PlaceCard({ p }: { p: PublicPlace }) {
  return (
    <div className="space-y-3 rounded-[28px] bg-white p-4 text-center ring-1 ring-sage-300">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.imageUrl} alt="" width={96} height={96} className="mx-auto" />
      <h3 className="text-lg">{p.name}</h3>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.qrUrl} alt={`QR code to collect a ${p.name} stamp`} width={180} height={180} className="mx-auto" />
      <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
        <Link href={`/place/${p.id}`} className="rounded-full bg-honey-500 py-2.5 text-ink">Print counter card</Link>
        <Link href={`/c/${p.id}`} className="rounded-full border-[1.5px] border-neutral-300 py-2.5">Preview stamp page</Link>
      </div>
    </div>
  );
}

export default function Join() {
  const [address, setAddress] = useState<string | null | undefined>(undefined);
  const [mine, setMine] = useState<PublicPlace[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("shop");
  const [tagline, setTagline] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [gps, setGps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [created, setCreated] = useState<{ place: PublicPlace; onMap: boolean } | null>(null);

  const refresh = useCallback(async () => {
    const a = await currentAddress().catch(() => null);
    setAddress(a);
    if (a) { const r = await fetch("/api/places/mine"); if (r.ok) setMine((await r.json()).places); } else setMine([]);
  }, []);
  useEffect(() => { const init = async () => { await refresh(); }; init(); }, [refresh]);

  async function pickLogo(f: File | undefined) {
    if (!f) return;
    try { setLogo(await prepareLogo(f)); setErr(""); } catch { setErr("We couldn't read that image. Try a PNG or JPEG."); }
  }
  function locate() {
    navigator.geolocation?.getCurrentPosition((p) => setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }), () => setErr("Location permission is needed to put you on the map."), { enableHighAccuracy: true, timeout: 15000 });
  }
  async function submit() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/places/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, kind, tagline, logo, ...(loc ?? {}), requireGps: gps && !!loc }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not set up your place");
      setCreated(j); await refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[22px] leading-tight">Run a place?</h1>
        <AccountChip onChange={refresh} />
      </div>
      <p className="text-sm text-neutral-700">Give your customers an eco stamp. Add your logo and a one-liner, and we generate your QR. Every stamp is anchored on Solana, and your place appears on the EcoProof map.</p>

      {address === undefined ? null : !address ? (
        <p className="rounded-2xl bg-cream p-4 text-sm">Connect your wallet to set up a place. It&apos;s a free signature, no fee, no funds move.</p>
      ) : created ? (
        <>
          <p className="rounded-xl bg-sage-200 p-3 text-sm font-semibold text-sage-900">🎉 {created.place.name} is set up{created.onMap ? " and on the map" : ""}. Put the QR where customers can scan it.</p>
          <PlaceCard p={created.place} />
          <button onClick={() => { setCreated(null); setName(""); setTagline(""); setLogo(null); setLoc(null); setGps(false); }} className="w-full rounded-full border-[1.5px] border-neutral-300 py-2.5 text-sm font-semibold">Set up another place</button>
        </>
      ) : (
        <div className="space-y-3 rounded-[28px] bg-neutral-100 p-4">
          <label className="block text-sm font-semibold">Name<input className={`${input} mt-1`} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Green Bean Café" /></label>
          <div>
            <span className="text-sm font-semibold">What is it?</span>
            <div className="mt-1 flex gap-2">{KINDS.map(([k, l]) => <button key={k} onClick={() => setKind(k)} className={`flex-1 rounded-full py-2 text-xs font-bold ${kind === k ? "bg-sage-500 text-cream" : "border-[1.5px] border-neutral-300"}`}>{l}</button>)}</div>
          </div>
          <label className="block text-sm font-semibold">One-line tagline<input className={`${input} mt-1`} value={tagline} maxLength={90} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Bring your own cup, skip the plastic" /></label>
          <label className="block rounded-2xl border-2 border-dashed border-neutral-300 p-3 text-center text-sm">
            {logo ? <span className="flex items-center justify-center gap-3">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={logo} alt="" width={56} height={56} className="rounded-full" /> Logo added · tap to change</span> : "🖼️ Upload your logo (optional)"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0])} />
          </label>
          <div className="space-y-2 rounded-2xl bg-cream p-3 text-sm">
            <button onClick={locate} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold ring-1 ring-neutral-300">{loc ? "📍 Location saved" : "📍 Use my current location (puts you on the map)"}</button>
            <label className={`flex items-center gap-2 text-xs ${loc ? "" : "opacity-50"}`}><input type="checkbox" disabled={!loc} checked={gps} onChange={(e) => setGps(e.target.checked)} /> Only give stamps to people who are at my place (GPS check)</label>
          </div>
          {err && <p className="rounded-xl bg-terra-100 p-2.5 text-sm text-terra-800">{err}</p>}
          <button onClick={submit} disabled={busy || name.trim().length < 2} className="w-full rounded-full bg-terra-500 py-3 font-bold text-cream disabled:opacity-60">{busy ? "Setting up…" : "Create my place and QR"}</button>
          <p className="text-[11px] text-neutral-500">Places are listed as &ldquo;claimed and set up&rdquo;. Independent vetting is on our roadmap.</p>
        </div>
      )}

      {address && !created && mine.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="text-[15px]">Your places</h2>
          {mine.map((p) => <PlaceCard key={p.id} p={p} />)}
        </section>
      )}
    </div>
  );
}
