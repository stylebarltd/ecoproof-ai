"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AccountChip from "@/components/AccountChip";
import { currentAddress } from "@/lib/wallet";
import { PLACE_KINDS, isPhysical } from "@/lib/placeKinds";
import { rulesFor } from "@/lib/ecoRules";
import { prepareLogo } from "@/lib/clientLogo";
import type { PublicPlace } from "@/lib/stampPlaces";

const input = "w-full rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-neutral-300";

function CardsButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function go() {
    setBusy(true); setMsg("");
    const r = await fetch(`/api/places/mine/${id}/cards`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: 20 }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) window.open(j.printUrl, "_blank"); else setMsg(j.error || "Could not make cards");
  }
  return (
    <div>
      <button onClick={go} disabled={busy} className="w-full rounded-full bg-honey-500 py-2.5 text-sm font-semibold text-ink disabled:opacity-60">{busy ? "Making cards…" : "Make 20 printable cards for your parcels"}</button>
      {msg && <p className="mt-1 text-xs text-terra-800">{msg}</p>}
    </div>
  );
}

type MyPlace = PublicPlace & { status?: string; statusNote?: string | null };
type WooSetup = { webhook: { deliveryUrl: string; secret: string; topic: string }; themeSnippet: string; themeSnippetOwnEmail: string };

function WooOption({ id }: { id: string }) {
  const [setup, setSetup] = useState<WooSetup | null>(null);
  const [msg, setMsg] = useState("");
  async function load() {
    const r = await fetch(`/api/places/mine/${id}/woo`);
    const j = await r.json().catch(() => ({}));
    if (r.ok) setSetup(j); else setMsg(j.error || "Could not load the setup");
  }
  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => setMsg("Copied"), () => setMsg("Select and copy it by hand"));
  return (
    <div className="space-y-2 rounded-2xl bg-sage-100 p-3 text-left text-sm">
      <p className="font-semibold">A. QR in your order email <span className="font-normal text-neutral-600">(WooCommerce shops)</span></p>
      <p className="text-xs text-neutral-600">Customers get a personal QR and button in the &ldquo;order completed&rdquo; email. It&apos;s signed per order, so a verified order stamp carries the real impact of what they bought.</p>
      {!setup ? (
        <button onClick={load} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold ring-1 ring-neutral-300">Show setup steps</button>
      ) : (
        <ol className="list-decimal space-y-2 pl-4 text-xs">
          <li>In WooCommerce: <b>Settings → Advanced → Webhooks → Add webhook</b>. Name EcoProof, Status Active, Topic <b>{setup.webhook.topic}</b>, API version WP REST API v3.</li>
          <li>Delivery URL: <code className="break-all">{setup.webhook.deliveryUrl}</code> <button onClick={() => copy(setup.webhook.deliveryUrl)} className="font-bold underline">copy</button></li>
          <li>Secret: <code className="break-all">{setup.webhook.secret}</code> <button onClick={() => copy(setup.webhook.secret)} className="font-bold underline">copy</button> (keep it private)</li>
          <li>Paste this into your <b>child theme&apos;s functions.php</b>: <button onClick={() => copy(setup.themeSnippet)} className="font-bold underline">copy snippet</button>
            <textarea readOnly value={setup.themeSnippet} rows={5} className="mt-1 w-full rounded-lg bg-white p-2 font-mono text-[10px] ring-1 ring-neutral-300" /></li>
          <li>Only if your order emails come from another plugin (an email customizer, FunnelKit…) and the QR doesn&apos;t show up: use <b>this snippet instead</b>. It sends its own short email when an order is completed. <button onClick={() => copy(setup.themeSnippetOwnEmail)} className="font-bold underline">copy snippet B</button></li>
        </ol>
      )}
      {msg && <p className="text-xs text-sage-800">{msg}</p>}
    </div>
  );
}

function PlaceCard({ p }: { p: MyPlace }) {
  const notice = p.status && p.status !== "active" ? <p className="rounded-xl bg-terra-100 p-2.5 text-xs text-terra-800">{p.status === "suspended" ? "This place was removed from EcoProof." : "This place is paused while we review reports."} {p.statusNote}</p> : null;
  if (p.kind === "online") {
    return (
      <div className="space-y-3 rounded-[28px] bg-white p-4 text-center ring-1 ring-sage-300">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.imageUrl} alt="" width={96} height={96} className="mx-auto" />
        <h3 className="text-lg">{p.name}</h3>
        {notice}
        <p className="text-xs text-neutral-600">Two ways to give customers their stamp. Use one or both.</p>
        <WooOption id={p.id} />
        <div className="space-y-2 rounded-2xl bg-sage-100 p-3 text-left text-sm">
          <p className="font-semibold">B. Printed QR cards in the parcel <span className="font-normal text-neutral-600">(any channel: Amazon, Lazada, Shopee…)</span></p>
          <p className="text-xs text-neutral-600">No shop code needed. Print the cards and drop one in each parcel. Every card gives one stamp, once. It can&apos;t show the order&apos;s impact, because a card doesn&apos;t prove what was bought.</p>
          <CardsButton id={p.id} />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-[28px] bg-white p-4 text-center ring-1 ring-sage-300">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.imageUrl} alt="" width={96} height={96} className="mx-auto" />
      <h3 className="text-lg">{p.name}</h3>
      {notice}
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
      const r = await fetch("/api/places/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, kind, tagline, logo, acceptRules: rules, ...(isPhysical(kind) ? loc ?? {} : {}) }) });
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
            <p className="rounded-2xl bg-cream p-3 text-xs text-neutral-600">Online shops have no map pin and no GPS check. After you create it you choose how customers get their stamp: a QR in your order email (WooCommerce), printed QR cards in the parcel (any channel, e.g. Amazon), or both.</p>
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

      {address && !created && mine.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="text-[15px]">Your places</h2>
          {mine.map((p) => <PlaceCard key={p.id} p={p} />)}
        </section>
      )}
    </div>
  );
}
