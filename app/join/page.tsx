"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AccountChip from "@/components/AccountChip";
import { currentAccount } from "@/lib/account";
import { useAccountChange, useDesktop } from "@/lib/desktop";
import { PLACE_KINDS, isPhysical } from "@/lib/placeKinds";
import { rulesFor } from "@/lib/ecoRules";
import { prepareLogo } from "@/lib/clientLogo";
import type { PublicPlace } from "@/lib/stampPlaces";
import { PlaceCard, type MyPlace } from "@/components/ShopTools";

const input = "w-full rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-neutral-300";

export default function Join() {
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);
  const [mine, setMine] = useState<MyPlace[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("shop");
  const [tagline, setTagline] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [rules, setRules] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [created, setCreated] = useState<{ place: PublicPlace; onMap: boolean } | null>(null);

  const refresh = useCallback(async () => {
    const a = (await currentAccount().catch(() => null))?.signedIn ?? false;
    setSignedIn(a);
    if (a) { const r = await fetch("/api/places/mine"); if (r.ok) setMine((await r.json()).places); } else setMine([]);
  }, []);
  useEffect(() => { const init = async () => { await refresh(); }; init(); }, [refresh]);
  const desktop = useDesktop();
  useAccountChange(refresh);

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
      const r = await fetch("/api/places/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, kind, tagline, logo, acceptRules: rules, ...(isPhysical(kind) ? loc ?? {} : {}) }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not set up your place");
      setCreated(j); await refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    setBusy(false);
  }

  return (
    <div className="space-y-4 lg:mx-auto lg:max-w-[720px]">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[22px] leading-tight lg:text-[30px]">Run a place?</h1>
        {!desktop && <AccountChip onChange={refresh} />}
      </div>
      <p className="text-sm text-neutral-700">Give your customers an eco stamp. Add your logo and a one-liner, and we generate your QR. Every stamp is anchored on Solana, and your place appears on the EcoProof map.</p>

      {signedIn === undefined ? null : !signedIn ? (
        <p className="rounded-2xl bg-cream p-4 text-sm">Sign in to set up a place, with Google or a Solana wallet. It&apos;s free.<span className="hidden lg:inline"> Use <b>Sign in</b> at the top right.</span></p>
      ) : created ? (
        <>
          <p className="rounded-xl bg-sage-200 p-3 text-sm font-semibold text-sage-900">🎉 {created.place.name} is set up{created.onMap ? " and on the map" : ""}. Put the QR where customers can scan it.</p>
          <PlaceCard p={created.place} />
          <Link href={`/shop/${created.place.id}`} className="block w-full rounded-full bg-sage-500 py-2.5 text-center text-sm font-bold text-cream">Open its dashboard</Link>
          <button onClick={() => { setCreated(null); setName(""); setTagline(""); setLogo(null); setLoc(null); setRules(false); }} className="w-full rounded-full border-[1.5px] border-neutral-300 py-2.5 text-sm font-semibold">Set up another place</button>
        </>
      ) : (
        <div className="space-y-3 rounded-[28px] bg-neutral-100 p-4">
          <label className="block text-sm font-semibold">Name<input className={`${input} mt-1`} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Green Bean Café" /></label>
          <div>
            <span className="text-sm font-semibold">What is it?</span>
            <div className="mt-1 flex flex-wrap gap-2">{PLACE_KINDS.map((k) => <button key={k.id} onClick={() => setKind(k.id)} className={`rounded-full px-3 py-2 text-xs font-bold ${kind === k.id ? "bg-sage-500 text-cream" : "border-[1.5px] border-neutral-300"}`}>{k.label}</button>)}</div>
          </div>
          <label className="block text-sm font-semibold">One-line tagline<input className={`${input} mt-1`} value={tagline} maxLength={90} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Bring your own cup, skip the plastic" /></label>
          <label className="block rounded-2xl border-2 border-dashed border-neutral-300 p-3 text-center text-sm">
            {logo ? <span className="flex items-center justify-center gap-3">{/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="" width={56} height={56} className="rounded-full" /> Logo added · tap to change</span> : "🖼️ Upload your logo (optional)"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0])} />
          </label>
          {isPhysical(kind) ? (
            <div className="space-y-2 rounded-2xl bg-cream p-3 text-sm">
              <button onClick={locate} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold ring-1 ring-neutral-300">{loc ? "📍 Location saved" : "📍 Use my current location"}</button>
              <p className="text-xs text-neutral-600">Do this while you&apos;re at your place. It puts you on the map, and stamps are only given to people who are there (GPS check, always on).</p>
            </div>
          ) : (
            <p className="rounded-2xl bg-cream p-3 text-xs text-neutral-600">Online shops have no map pin and no GPS check. After you create it you choose how customers get their stamp: a QR in your order email (WooCommerce, with our free plugin), printed QR cards in the parcel (any channel, e.g. Amazon), or both.</p>
          )}
          <div className="space-y-2 rounded-2xl bg-white p-3 text-sm ring-1 ring-neutral-300">
            <p className="font-semibold">EcoProof is only for eco places</p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-neutral-700">{rulesFor(kind).map((r) => <li key={r}>{r}</li>)}</ul>
            <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={rules} onChange={(e) => setRules(e.target.checked)} /> <span>I confirm my place keeps these rules. I understand customers can report places that don&apos;t, and that EcoProof can pause or remove them. <Link href="/rules" className="underline">Read the rules</Link></span></label>
          </div>
          {err && <p className="rounded-xl bg-terra-100 p-2.5 text-sm text-terra-800">{err}</p>}
          <button onClick={submit} disabled={busy || name.trim().length < 2 || !rules || (isPhysical(kind) && !loc)} className="w-full rounded-full bg-terra-500 py-3 font-bold text-cream disabled:opacity-60">{busy ? "Setting up…" : "Create my place and QR"}</button>
          <p className="text-[11px] text-neutral-500">Places are listed as &ldquo;claimed and set up&rdquo;. Independent vetting is on our roadmap.</p>
        </div>
      )}

      {signedIn && !created && mine.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="text-[15px]">Your places</h2>
          {mine.map((p) => (
            <Link key={p.id} href={`/shop/${p.id}`} className="lift flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-sage-300">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl} alt="" width={44} height={44} className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block font-heading text-[15px] leading-tight">{p.name}</span>
                <span className="block text-xs text-neutral-600">{p.role === "staff" ? "Staff" : "Owner"} · customer activity, QR codes, team</span>
              </span>
              <span className="text-sm font-bold text-sage-700">Open →</span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
