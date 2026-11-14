"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Check, ChevronRight, ImagePlus, Loader2, MapPin } from "lucide-react";
import { SocialButton, WalletSheet } from "@/components/AccountChip";
import { currentAccount, type Social } from "@/lib/account";
import { announceAccountChange, useAccountChange } from "@/lib/desktop";
import { hasStars } from "@/lib/practices";
import { GPS_RADIUS_M, PLACE_KINDS, isShop } from "@/lib/placeKinds";
import { rulesFor } from "@/lib/ecoRules";
import { prepareLogo } from "@/lib/clientLogo";
import type { PublicPlace } from "@/lib/stampPlaces";
import type { MyPlace } from "@/components/ShopTools";

const PinPicker = dynamic(() => import("@/components/PinPicker"), { ssr: false, loading: () => <div className="h-64 w-full rounded-[16px] bg-kraft/40" /> });

// The journal's pieces (DESIGN.md): honey is the one next action, cocoa ink buttons and sky-underlined links are everything else.
const honey = "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-honey px-6 text-[16px] font-extrabold text-cocoa shadow-[0_8px_22px_rgba(224,138,46,0.38)] transition hover:bg-honey-light disabled:opacity-60 disabled:shadow-none";
const ink = "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-cocoa px-5 text-[15px] font-extrabold text-paper transition hover:bg-honey-ink";
const linkCta = "inline-flex items-center gap-1.5 text-[15px] font-extrabold text-cocoa underline decoration-sky decoration-[3px] underline-offset-4 hover:decoration-honey";
const card = "sticker grain rounded-[20px] bg-paper p-5 ring-1 ring-cocoa/10 sm:p-7";
const input = "mt-1.5 h-12 w-full rounded-xl bg-white px-3.5 text-[16px] text-cocoa ring-1 ring-cocoa/20 placeholder:text-cocoa/50 focus:ring-2 focus:ring-honey focus:outline-none";
const fieldLabel = "block text-[15px] font-extrabold";
const note = "text-[13px] font-bold leading-snug text-cocoa/80";

const STEPS = [
  ["Sign in", "So the place has an owner who can always get back in. No password, and no wallet needed."],
  ["Tell us about your place", "Its name, what kind of place it is, a logo and, if customers visit you, where it is."],
  ["Put up your QR", "Print the counter card. Online shops send a QR in the order email or a card in the parcel instead."],
] as const;

/** The /join page's content: signed out, what joining takes and the sign-in (Google and Facebook first, a wallet only under "other ways");
 *  signed in, the set-up form; after that, the new place's QR and what to do next. */
export default function JoinFlow({ initialKind = "cafe", near = null }: { initialKind?: string; near?: { lat: number; lng: number } | null }) {
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);
  const [social, setSocial] = useState<Social[]>([]);
  const [mine, setMine] = useState<MyPlace[]>([]);
  const [created, setCreated] = useState<{ place: PublicPlace; onMap: boolean } | null>(null);
  const [formKey, setFormKey] = useState(0);

  const refresh = useCallback(async () => {
    const a = await currentAccount().catch(() => null);
    setSignedIn(a?.signedIn ?? false);
    setSocial(a?.social ?? []);
    if (a?.signedIn) { const r = await fetch("/api/places/mine"); if (r.ok) setMine((await r.json()).places); } else setMine([]);
  }, []);
  useEffect(() => { const init = async () => { await refresh(); }; init(); }, [refresh]);
  useAccountChange(refresh);

  if (signedIn === undefined) return <div className="h-[60vh]" aria-busy="true" />;

  if (created) return <Created {...created} onAnother={() => { setCreated(null); setFormKey((k) => k + 1); }} />;

  if (!signedIn) {
    return (
      <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-start lg:gap-14">
        <div>
          <h1 className="text-[36px] leading-[1.04] sm:text-[46px]">Join as a business</h1>
          <p className="mt-4 max-w-xl text-[18px] leading-[1.6] text-cocoa/85">Set up your café, restaurant, hotel or eco shop in about 10 minutes. The first 50 businesses join free, with everything included, for as long as EcoProof exists.</p>
          <ol className="mt-8 space-y-5">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-journal-display text-[20px] font-bold text-cocoa ring-2 ring-cocoa/25" aria-hidden>{i + 1}</span>
                <span>
                  <span className="block text-[18px] font-extrabold leading-snug">{title}</span>
                  <span className="mt-0.5 block text-[15px] leading-[1.6] text-cocoa/85">{text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <SignIn social={social} onSignedIn={() => { announceAccountChange(); void refresh(); }} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[680px]">
      <h1 className="text-[36px] leading-[1.04] sm:text-[46px]">Set up your place</h1>
      <p className="mt-4 text-[18px] leading-[1.6] text-cocoa/85">You&apos;re signed in. Fill this in once and we make your QR. You can change everything later on your dashboard.</p>
      <PlaceForm key={formKey} initialKind={initialKind} near={near} onCreated={async (c) => { setCreated(c); await refresh(); }} />
      {mine.length > 0 && (
        <section className="mt-12">
          <h2 className="text-[22px] leading-[1.15]">Places you already run</h2>
          <ul className="mt-4 space-y-3">
            {mine.map((p) => (
              <li key={p.id}>
                <Link href={`/shop/${p.id}`} className="lift flex items-center gap-3 rounded-[16px] bg-paper p-3 ring-1 ring-cocoa/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imageUrl} alt="" width={44} height={44} className="shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-extrabold leading-tight">{p.name}</span>
                    <span className="block text-[13px] font-bold text-cocoa/80">{p.role === "staff" ? "Staff" : "Owner"} · customer activity, QR codes, team</span>
                  </span>
                  <ChevronRight size={20} strokeWidth={2.5} className="shrink-0 text-cocoa/80" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Google and Facebook first, as the account's own buttons; a Solana wallet only behind "Other ways to sign in", or as the one way when no
 *  social sign-in is configured (a local setup without keys). */
function SignIn({ social, onSignedIn }: { social: Social[]; onSignedIn: () => void }) {
  const [wallet, setWallet] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className={card}>
      <h2 className="text-[22px] leading-[1.15]">Start by signing in</h2>
      <p className="mt-2 text-[15px] leading-[1.6] text-cocoa/85">It&apos;s free. Your customers never need an account or a wallet to collect stamps.</p>
      <div className="mt-5 space-y-3">
        {social.map((p) => <SocialButton key={p} provider={p} onError={setErr} />)}
        {social.length === 0 && <button onClick={() => setWallet(true)} className={ink}>Sign in with a Solana wallet</button>}
      </div>
      {err && <p className="mt-3 rounded-xl bg-terracotta/15 p-3 text-[15px] font-bold text-terracotta-ink" role="alert">{err}</p>}
      {social.length > 0 && <button onClick={() => setWallet(true)} className={`${linkCta} mt-5`}>Other ways to sign in</button>}
      <p className={`${note} mt-5`}>What we keep and why: <Link href="/privacy" className="underline decoration-sky decoration-2 underline-offset-2 hover:decoration-honey">Privacy</Link></p>
      {wallet && <WalletSheet connect={false} onClose={() => setWallet(false)} onSignedIn={onSignedIn} />}
    </div>
  );
}

function PlaceForm({ initialKind, near, onCreated }: { initialKind: string; near: { lat: number; lng: number } | null; onCreated: (c: { place: PublicPlace; onMap: boolean }) => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState(initialKind);
  const [mapOpen, setMapOpen] = useState(false);
  const [tagline, setTagline] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  // An eco shop's channels; every other kind is in store.
  const [shopInStore, setShopInStore] = useState(true);
  const [shopOnline, setShopOnline] = useState(false);
  const [website, setWebsite] = useState("");
  const inStore = !isShop(kind) || shopInStore;
  const [rules, setRules] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pickLogo(f: File | undefined) {
    if (!f) return;
    try { setLogo(await prepareLogo(f)); setErr(""); } catch { setErr("We couldn't read that image. Try a PNG or JPEG."); }
  }
  function locate() {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      (p) => { setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); },
      () => { setErr("We couldn't get your location. Pin your place on the map instead."); setMapOpen(true); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }
  async function submit() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/places/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, kind, tagline, logo, acceptRules: rules, inStore, online: isShop(kind) && shopOnline, website: isShop(kind) && shopOnline ? website : "", ...(inStore ? loc ?? {} : {}) }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not set up your place");
      onCreated(j);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    setBusy(false);
  }
  // What still stops "Create my place", said under the button instead of a silent disabled state.
  const missing = [
    name.trim().length < 2 && "a name",
    isShop(kind) && !shopInStore && !shopOnline && "how customers buy from you",
    inStore && !loc && "where your place is",
    !rules && "your confirmation of the eco rules",
  ].filter((m): m is string => !!m);
  const ready = missing.length === 0;

  return (
    <div className={`${card} mt-8 space-y-6`}>
      <label className={fieldLabel}>Name<input className={input} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Green Bean Café" /></label>

      <fieldset>
        <legend className={fieldLabel}>What kind of place is it?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {PLACE_KINDS.map((k) => (
            <button key={k.id} type="button" aria-pressed={kind === k.id} onClick={() => setKind(k.id)} className={`h-11 rounded-full px-4 text-[15px] font-extrabold transition ${kind === k.id ? "bg-cocoa text-paper" : "bg-white text-cocoa ring-1 ring-cocoa/20 hover:bg-kraft/40"}`}>{k.label}</button>
          ))}
        </div>
      </fieldset>

      <label className={fieldLabel}>One-line tagline <span className="font-bold text-cocoa/80">(optional)</span><input className={input} value={tagline} maxLength={90} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Bring your own cup, skip the plastic" /></label>

      <label className="flex cursor-pointer items-center gap-4 rounded-[16px] border-2 border-dashed border-cocoa/25 p-4 hover:bg-kraft/20">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" width={56} height={56} className="shrink-0 rounded-full" />
        ) : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-kraft/50"><ImagePlus size={24} className="text-cocoa/80" aria-hidden /></span>}
        <span>
          <span className="block text-[15px] font-extrabold">{logo ? "Logo added" : "Add your logo"}</span>
          <span className={note}>{logo ? "Tap to change it." : "Optional. PNG, JPEG or WebP. It goes on your QR and your map pin."}</span>
        </span>
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => pickLogo(e.target.files?.[0])} />
      </label>

      {isShop(kind) && (
        <fieldset className="space-y-3">
          <legend className={fieldLabel}>How do customers buy from you?</legend>
          <Tick checked={shopInStore} onChange={setShopInStore}><b>In our shop.</b> You get a map pin and a QR for the counter.</Tick>
          <Tick checked={shopOnline} onChange={setShopOnline}><b>Online.</b> Stamps come from your order emails (WooCommerce) or cards in your parcels, on any channel.</Tick>
          {shopOnline && (
            <>
              <input className={input} value={website} maxLength={200} inputMode="url" aria-label="Your website" onChange={(e) => setWebsite(e.target.value)} placeholder="Your website, e.g. https://yourshop.com" />
              <p className={note}>Your shop is listed in EcoProof&apos;s shop directory. You add where you ship from in your shop settings afterwards.</p>
            </>
          )}
          <p className={note}>Eco shops show the plastic and CO₂ their customers save instead of stars.</p>
        </fieldset>
      )}

      {inStore ? (
        <div>
          <p className={fieldLabel}>Where is it?</p>
          <p className="mt-1 text-[15px] leading-[1.6] text-cocoa/85">It puts you on the map, and a stamp is only given to someone within {GPS_RADIUS_M} m of it (a GPS check, always on). At your place, use your phone&apos;s location; anywhere else, pin it on the map.</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <button type="button" onClick={locate} className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-extrabold transition ${loc ? "bg-white text-cocoa ring-1 ring-cocoa/20" : "bg-cocoa text-paper hover:bg-honey-ink"}`}>
              {locating ? <Loader2 size={18} className="animate-spin" aria-hidden /> : loc ? <Check size={18} strokeWidth={3} className="text-leaf-ink" aria-hidden /> : <MapPin size={18} aria-hidden />}
              {loc ? "Location saved" : "Use my current location"}
            </button>
            <button type="button" onClick={() => setMapOpen((o) => !o)} aria-expanded={mapOpen} className={linkCta}>{mapOpen ? "Hide the map" : loc ? "Move the pin on the map" : "Or pin it on the map"}</button>
          </div>
          {mapOpen && (
            <div className="mt-3">
              <PinPicker pin={loc} onPick={(p) => { setLoc(p); setErr(""); }} precise start={near} className="h-64 rounded-[16px] ring-1 ring-cocoa/15" />
              <p className={`${note} mt-2`}>Zoom in until you can see your street, then tap your door. Tap again to move the pin.</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[15px] leading-[1.6] text-cocoa/85">A shop that only sells online has no map pin and no GPS check. Once it&apos;s set up you choose how customers get their stamp: a QR in your order email (WooCommerce, with our free plugin), printed QR cards in the parcel (any channel, e.g. Amazon), or both. You can add a shop location later.</p>
      )}

      <div className="stitched rounded-[20px] bg-kraft/50 p-5 sm:p-6">
        <p className="text-[18px] font-extrabold">EcoProof is only for eco places</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-[1.6] text-cocoa/85">{rulesFor(kind).map((r) => <li key={r}>{r}</li>)}</ul>
        <div className="mt-4">
          <Tick checked={rules} onChange={setRules}>I confirm my place keeps these rules. I understand customers can report places that don&apos;t, and that EcoProof can pause or remove them. <Link href="/rules" className="font-extrabold underline decoration-sky decoration-2 underline-offset-2 hover:decoration-honey">Read the rules</Link></Tick>
        </div>
      </div>

      {err && <p className="rounded-xl bg-terracotta/15 p-3 text-[15px] font-bold text-terracotta-ink" role="alert">{err}</p>}
      <div>
        <button onClick={submit} disabled={busy || !ready} aria-describedby={ready ? undefined : "join-missing"} className={honey}>{busy ? <><Loader2 size={18} className="animate-spin" aria-hidden /> Setting up…</> : <>Create my place and QR <ArrowRight size={18} aria-hidden /></>}</button>
        {!ready && <p id="join-missing" className="mt-3 text-center text-[15px] font-bold text-cocoa/85">Still needed: {missing.join(", ")}.</p>}
        <p className={`${note} mt-3 text-center`}>Places are listed as &ldquo;claimed and set up&rdquo;. Independent vetting is on our roadmap.</p>
      </div>
    </div>
  );
}

function Tick({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-[1.55] text-cocoa/85">
      <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-cocoa" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

/** Done: the new place's QR (in store) and the next steps, each a different weight so only one is honey. */
function Created({ place, onMap, onAnother }: { place: PublicPlace; onMap: boolean; onAnother: () => void }) {
  const stars = hasStars(place.kind);
  return (
    <div className="mx-auto max-w-[560px] text-center">
      <h1 className="text-[36px] leading-[1.04] sm:text-[46px]">{place.name} is set up</h1>
      <p className="mt-4 text-[18px] leading-[1.6] text-cocoa/85">
        {place.inStore ? `${onMap ? "It's on the map. " : ""}Put the QR where customers can scan it: every scan gives them a stamp.` : "Next, choose how your customers get their stamp: a QR in your order email, printed cards in the parcel, or both."}
      </p>
      <div className={`${card} mt-8`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={place.imageUrl} alt="" width={80} height={80} className="mx-auto" />
        {place.inStore && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={place.qrUrl} alt={`QR code to collect a ${place.name} stamp`} width={200} height={200} className="mx-auto mt-4 rounded-xl bg-white p-2" />
            <p className={`${note} mt-3 hidden lg:block`}>Try it: scan this QR with your phone&apos;s camera to see what customers see.</p>
          </>
        )}
        <div className="mt-6 space-y-3">
          {place.inStore
            ? <Link href={`/place/${place.id}`} className={honey}>Print your counter card <ArrowRight size={18} aria-hidden /></Link>
            : <Link href={`/shop/${place.id}`} className={honey}>Connect your online shop <ArrowRight size={18} aria-hidden /></Link>}
          {stars && <Link href={`/shop/${place.id}/practices`} className={ink}>Tick your eco practices to earn stars</Link>}
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-3">
          {place.inStore && <Link href={`/shop/${place.id}`} className={linkCta}>Open its dashboard</Link>}
          {place.inStore && <Link href={`/c/${place.id}`} className={linkCta}>Preview the stamp page</Link>}
          <button onClick={onAnother} className={linkCta}>Set up another place</button>
        </div>
      </div>
    </div>
  );
}
