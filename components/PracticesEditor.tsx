"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Check, ExternalLink, Globe, Link2, Loader2, MapPin, Sparkles } from "lucide-react";
import AccountChip from "@/components/AccountChip";
import PublishSheet from "@/components/PublishSheet";
import Stars from "@/components/Stars";
import { useAccountChange, useDesktop } from "@/lib/desktop";
import { readProgress } from "@/lib/progress";
import { PLACE_KINDS, kindOf } from "@/lib/placeKinds";
import { PRACTICES, checklist, nextStar, rating, type Answers, type Status } from "@/lib/practices";
import type { Declaration } from "@/lib/declarations";
import type { Role } from "@/lib/members";
import type { PublicPlace } from "@/lib/stampPlaces";

// The owner's eco checklist: place type, address, and Yes / No / Not applicable per practice (data/practices.json), with the stars
// they earn updating live, and the easiest practices to reach the next star. Staff see it read-only.
// Saving keeps a private draft. Publishing (after a warning) makes it public and writes its fingerprint to Solana (lib/declarations.ts).

const PinPicker = dynamic(() => import("@/components/PinPicker"), { ssr: false, loading: () => <div className="h-56 w-full rounded-2xl bg-sage-200" /> });

type Pin = { lat: number; lng: number };
type Setup = {
  place: PublicPlace; role: Role; kind: string; alsoCafe: boolean; address: string | null; answers: Answers;
  website: string | null; shipsFrom: string | null; shipsFromPin: Pin | null; shipsTo: string | null;
  published: Declaration | null; publishedMatchesType: boolean; unpublishedChanges: boolean; publishedToday: boolean;
};

const CHOICES: { status: Status; label: string; on: string }[] = [
  { status: "yes", label: "Yes", on: "bg-sage-500 text-cream" },
  { status: "no", label: "No", on: "bg-terra-500 text-cream" },
  { status: "not_applicable", label: "N/A", on: "bg-neutral-500 text-cream" },
];

function Choice({ value, allowNA, disabled, onChange, name }: { value: Status | undefined; allowNA: boolean; disabled: boolean; onChange: (s: Status) => void; name: string }) {
  return (
    <div className="flex shrink-0 rounded-full bg-white/70 p-0.5 ring-1 ring-sage-900/10" role="radiogroup" aria-label={name}>
      {CHOICES.filter((c) => allowNA || c.status !== "not_applicable").map((c) => (
        <button
          key={c.status}
          role="radio"
          aria-checked={value === c.status}
          disabled={disabled}
          onClick={() => onChange(c.status)}
          title={c.status === "not_applicable" ? "Not applicable: this doesn't exist at your place (it is left out of your score)" : undefined}
          className={`min-w-[42px] rounded-full px-2.5 py-1.5 text-[12px] font-bold transition ${value === c.status ? c.on : "text-sage-900 hover:bg-sage-200/60"}`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

export default function PracticesEditor({ id }: { id: string }) {
  const [state, setState] = useState<"loading" | "ready" | "signin" | "missing">("loading");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [kind, setKind] = useState("cafe");
  const [alsoCafe, setAlsoCafe] = useState(false);
  const [address, setAddress] = useState("");
  const [online, setOnline] = useState(false); // an eco shop's online channel
  const [newLoc, setNewLoc] = useState<{ lat: number; lng: number } | null>(null); // a shop location being added, saved with Save
  const [website, setWebsite] = useState("");
  const [shipsFrom, setShipsFrom] = useState("");
  const [shipsPin, setShipsPin] = useState<Pin | null>(null);
  const [shipsTo, setShipsTo] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null); // JSON of what is saved, to tell unsaved changes apart
  const [err, setErr] = useState("");
  const [publishing, setPublishing] = useState(false); // the warning sheet is open
  const desktop = useDesktop();

  const apply = (s: Setup) => {
    setSetup(s); setKind(s.kind); setAlsoCafe(s.alsoCafe); setAddress(s.address ?? ""); setAnswers(s.answers); setOnline(s.place.online); setNewLoc(null);
    setWebsite(s.website ?? ""); setShipsFrom(s.shipsFrom ?? ""); setShipsPin(s.shipsFromPin); setShipsTo(s.shipsTo ?? "");
    setSaved(JSON.stringify({ kind: s.kind, alsoCafe: s.alsoCafe, address: s.address ?? "", answers: s.answers, online: s.place.online, newLoc: null, website: s.website ?? "", shipsFrom: s.shipsFrom ?? "", shipsPin: s.shipsFromPin, shipsTo: s.shipsTo ?? "" }));
  };
  const load = useCallback(async () => {
    const r = await fetch(`/api/places/mine/${id}/practices`, { cache: "no-store" });
    if (r.status === 401) { setState("signin"); return; }
    if (!r.ok) { setState("missing"); return; }
    apply(await r.json()); setState("ready");
  }, [id]);
  useEffect(() => { const init = async () => { await load(); }; init(); }, [load]);
  useAccountChange(load);

  const groups = useMemo(() => checklist(kind, alsoCafe), [kind, alsoCafe]);
  const live = useMemo(() => rating(kind, alsoCafe, answers), [kind, alsoCafe, answers]);
  const next = useMemo(() => nextStar(kind, alsoCafe, answers), [kind, alsoCafe, answers]);
  const dirty = saved !== JSON.stringify({ kind, alsoCafe, address, answers, online, newLoc, website, shipsFrom, shipsPin, shipsTo });
  const inStore = !!setup?.place.inStore || !!newLoc;
  const canEdit = setup?.role === "owner";
  const open = groups ? groups.flatMap((g) => g.items).filter((p) => !answers[p.id]).length : 0;

  /** Saves the draft; returns false (and shows why) if it couldn't. */
  async function save(): Promise<boolean> {
    setSaving(true); setErr("");
    let ok = false;
    try {
      // Only answers for the current checklist are sent; others stay stored for if the type is switched back.
      const ids = new Set(groups?.flatMap((g) => g.items.map((p) => p.id)) ?? []);
      const r = await fetch(`/api/places/mine/${id}/practices`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, alsoCafe, address, online, location: newLoc, website, shipsFrom, shipsFromPin: shipsPin, shipsTo, answers: Object.fromEntries(Object.entries(answers).filter(([k]) => ids.has(k))) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Couldn't save.");
      apply({ ...setup!, ...j });
      ok = true;
    } catch (e) { setErr(e instanceof Error ? e.message : "Couldn't save."); }
    setSaving(false);
    return ok;
  }

  /** Saves unsaved changes first, then publishes with live progress (as a stamp claim does). Throws with a message for the sheet. */
  async function publish(onStep: (step: string) => void): Promise<Declaration> {
    if (dirty) {
      onStep("save");
      if (!(await save())) throw new Error("Couldn't save your changes first. Check the message at the bottom of the page.");
    }
    const r = await fetch(`/api/places/mine/${id}/practices/publish`, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" }, body: JSON.stringify({ confirm: true }),
    });
    const res = await readProgress<{ declaration: Declaration; setup: Omit<Setup, "place" | "role"> }>(r, onStep)
      .catch((e: Error) => { throw e.message.startsWith("The connection dropped") ? new Error("The connection dropped. Reload the page to see whether it was published.") : e; });
    apply({ ...setup!, ...res.setup });
    return res.declaration;
  }

  /** Writes a pending proof to Solana now. Returns the declaration, or null (with a message) if Solana is still slow. */
  async function retryProof(declId: string): Promise<Declaration | null> {
    const r = await fetch(`/api/declarations/${declId}/anchor`, { method: "POST" });
    if (!r.ok) { setErr((await r.json().catch(() => ({}))).error || "Solana is slow right now. Try again in a moment."); return null; }
    await load();
    return r.json();
  }

  const header = (
    <div className="flex items-center justify-between gap-2">
      <Link href={`/shop/${id}`} className="flex items-center gap-1 text-sm font-bold text-sage-800"><ArrowLeft size={16} strokeWidth={2.5} /> {setup?.place.name ?? "My shop"}</Link>
      {!desktop && <AccountChip onChange={load} />}
    </div>
  );
  if (state !== "ready" || !setup) {
    return (
      <div className="space-y-4 lg:mx-auto lg:max-w-[720px]">
        {header}
        {state === "loading" ? <Loader2 size={24} className="mx-auto animate-spin text-sage-700" /> : (
          <p className="glass rounded-[22px] p-4 text-sm">{state === "signin" ? "Sign in to set up your place's eco practices." : "This place isn't one you run. Check you're signed in with the right account."}</p>
        )}
      </div>
    );
  }

  const kinds = PLACE_KINDS; // a café, restaurant or hotel needs a location; the server says so if an online-only shop picks one
  const locate = () => navigator.geolocation?.getCurrentPosition(
    (p) => { setNewLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setErr(""); },
    () => setErr("Location permission is needed to add your shop to the map."), { enableHighAccuracy: true, timeout: 15000 },
  );
  const type = PRACTICES.placeTypes[kind];

  const preview = live && (
    <section className="glass rounded-[28px] p-4 lg:p-5" aria-live="polite">
      <p className="text-[11.5px] font-bold uppercase tracking-wide text-sage-900">Your draft rating {dirty && canEdit ? "· not saved yet" : ""}</p>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <Stars stars={live.stars} size={desktop ? 26 : 22} />
        <span className="text-right"><span className="block font-heading text-[22px] leading-none">{live.stars ? `${live.stars} star${live.stars === 1 ? "" : "s"}` : live.label}</span><span className="text-[11.5px] text-sage-900">{live.score} of 100 points</span></span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-honey-500 transition-all" style={{ width: `${live.score}%` }} /></div>
      {open > 0 && <p className="mt-2 text-[11.5px] text-sage-900">{open} practice{open === 1 ? "" : "s"} not answered yet. Unanswered counts as no.</p>}
      {next ? (
        <div className="mt-3 rounded-2xl bg-white/60 p-3">
          <p className="flex items-center gap-1.5 text-[13px] font-bold"><Sparkles size={15} strokeWidth={2.5} className="text-honey-700" /> Next step up: {next.stars} star{next.stars === 1 ? "" : "s"}</p>
          <p className="mt-0.5 text-[11.5px] text-sage-900">Start {next.items.length === 1 ? "this practice" : `these ${next.items.length} practices`} to get there:</p>
          <ul className="mt-1.5 space-y-1">
            {next.items.map((p) => (
              <li key={p.id} className="flex items-start gap-2 text-[12.5px] leading-snug">
                <span className="mt-0.5 shrink-0 rounded-full bg-honey-300 px-1.5 text-[10.5px] font-bold">+{p.points}</span>
                <button onClick={() => document.getElementById(`practice-${p.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" })} className="text-left underline decoration-sage-900/30 underline-offset-2">{p.label}</button>
              </li>
            ))}
          </ul>
        </div>
      ) : live.stars === 5 ? <p className="mt-3 rounded-2xl bg-white/60 p-3 text-[13px] font-bold">Top of the scale. Thank you!</p> : null}
      <Link href={`/places/${id}`} className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-sage-800 underline">See your public page <ExternalLink size={12} /></Link>
    </section>
  );

  const pub = setup.published;
  const status = live && (
    <section className="glass rounded-[28px] p-4 lg:p-5">
      <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-sage-900"><Link2 size={13} strokeWidth={2.6} /> What the public sees</p>
      {pub && setup.publishedMatchesType ? (
        <>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <Stars stars={pub.stars} size={18} />
            <span className="text-right text-[12px] text-sage-900">Declaration {pub.version} · {new Date(pub.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
          {pub.txUrl ? (
            <a href={pub.txUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-sage-800 underline">Proof on Solana <ExternalLink size={11} /></a>
          ) : (
            <p className="mt-2 text-[12px] text-sage-900">Proof on Solana pending. {canEdit && <button onClick={() => retryProof(pub.id)} className="font-bold underline">Write it now</button>}</p>
          )}
        </>
      ) : (
        <p className="mt-1.5 text-[13px] leading-snug">{pub ? `Your last declaration was for a different place type, so visitors see no stars. Publish again for a ${kindOf(setup.kind)?.label.toLowerCase()}.` : "Nothing published yet. Visitors see your place as Listed, without stars, until you publish."}</p>
      )}
      {canEdit && (setup.unpublishedChanges || dirty) && (
        <p className="mt-2 rounded-xl bg-honey-300/50 p-2 text-[12px] leading-snug">{setup.publishedToday ? "You published today. You can publish these changes tomorrow." : "Your draft differs from what is published. Publish it to make it public."}</p>
      )}
    </section>
  );
  const canPublish = canEdit && !!live && (setup.unpublishedChanges || dirty) && !setup.publishedToday;

  return (
    <div className="space-y-4 pb-24 lg:space-y-6 lg:pb-8">
      {header}
      <div>
        <h1 className="text-[24px] leading-tight lg:text-[30px]">{groups ? "Eco practices and stars" : "Shop settings"}</h1>
        {!groups ? <p className="mt-1 text-[13px] text-sage-900">Your place type, address, and how customers buy from you.</p> : <p className="mt-1 text-[13px] text-sage-900">Tick what your place really does. Save as often as you like: your draft stays private. When it&apos;s right, publish it. Then visitors see it on your public page, its fingerprint is written to the Solana blockchain for good, and visitors can report anything that isn&apos;t true.</p>}
      </div>
      {!canEdit && <p className="rounded-2xl bg-cream p-3 text-sm">Only the owner can change these. You&apos;re staff, so this is read-only.</p>}

      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 lg:space-y-0">
        <div className="space-y-4">
          <section className="glass space-y-3 rounded-[28px] p-4 lg:p-5">
            <div>
              <p className="text-[13px] font-bold">What kind of place is it?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {kinds.map((k) => (
                  <button key={k.id} disabled={!canEdit} onClick={() => setKind(k.id)} aria-pressed={kind === k.id} className={`rounded-full px-3 py-2 text-xs font-bold ${kind === k.id ? "bg-sage-500 text-cream" : "bg-white/70 ring-1 ring-sage-900/10"}`}>{k.label}</button>
                ))}
              </div>
              {kind === "restaurant" && (
                <label className="mt-2.5 flex items-center gap-2 text-[13px]"><input type="checkbox" disabled={!canEdit} checked={alsoCafe} onChange={(e) => setAlsoCafe(e.target.checked)} className="h-4 w-4 accent-sage-600" /> We&apos;re a café too (adds the café&apos;s serving practices)</label>
              )}
              {type?.notes && type.hasStars && <p className="mt-2 text-[11.5px] text-sage-900">{type.notes}</p>}
            </div>
            {inStore && (
              <label className="block">
                <span className="text-[13px] font-bold">Address</span>
                <input value={address} disabled={!canEdit} onChange={(e) => setAddress(e.target.value)} maxLength={200} placeholder="Street, area, city" className="mt-1 w-full rounded-xl bg-white/80 px-3 py-2.5 text-sm ring-1 ring-sage-900/15" />
              </label>
            )}
          </section>

          {!desktop && status}
          {!desktop && preview}

          {groups ? groups.map((g) => (
            <section key={g.id} className="glass rounded-[28px] p-4 lg:p-5">
              <h2 className="mb-2 text-[17px]">{g.label}</h2>
              <ul className="divide-y divide-sage-900/10">
                {g.items.map((p) => (
                  <li key={p.id} id={`practice-${p.id}`} className="flex scroll-mt-24 flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-[13.5px] leading-snug">
                      {p.label} <span className="whitespace-nowrap text-[11px] font-bold text-sage-800">· {p.points} pt{p.points === 1 ? "" : "s"}</span>
                    </span>
                    <Choice name={p.label} value={answers[p.id]} allowNA={!!p.notApplicableAllowed} disabled={!canEdit} onChange={(s) => setAnswers((a) => ({ ...a, [p.id]: s }))} />
                  </li>
                ))}
              </ul>
            </section>
          )) : (
            <section className="glass space-y-3 rounded-[28px] p-4 text-sm lg:p-5">
              <div>
                <h2 className="text-[17px]">How do customers buy from you?</h2>
                <p className="mt-0.5 text-[12.5px] text-sage-900">{kindOf(kind)?.plural ?? "Shops"} show the plastic and CO₂ their customers save instead of stars. Use one channel or both.</p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-white/60 p-3">
                <MapPin size={18} strokeWidth={2.5} className="mt-0.5 shrink-0 text-sage-800" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">In our shop</p>
                  {setup.place.inStore ? <p className="text-[12.5px] text-sage-900">On the map, with a QR for your counter. To remove a location, contact us.</p>
                    : newLoc ? <p className="text-[12.5px] text-sage-900">Location added. Save to put your shop on the map.</p>
                    : <>
                        <p className="text-[12.5px] text-sage-900">Not on the map yet. Add your location from your phone while you&apos;re at the shop.</p>
                        {canEdit && <button onClick={locate} className="mt-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold ring-1 ring-sage-900/15">📍 Use my current location</button>}
                      </>}
                </div>
              </div>
              <label className="flex items-start gap-3 rounded-2xl bg-white/60 p-3">
                <Globe size={18} strokeWidth={2.5} className="mt-0.5 shrink-0 text-sage-800" />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">Online</span>
                  <span className="block text-[12.5px] text-sage-900">Stamps come from your order emails (WooCommerce) or cards in your parcels. Set them up on your shop&apos;s page.</span>
                </span>
                <input type="checkbox" checked={online} disabled={!canEdit} onChange={(e) => setOnline(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-sage-600" />
              </label>
              {online && (
                <div className="space-y-3 rounded-2xl bg-white/60 p-3">
                  <label className="block">
                    <span className="text-[13px] font-bold">Website</span>
                    <input value={website} disabled={!canEdit} onChange={(e) => setWebsite(e.target.value)} maxLength={200} inputMode="url" placeholder="https://yourshop.com" className="mt-1 w-full rounded-xl bg-white/80 px-3 py-2.5 text-sm ring-1 ring-sage-900/15" />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[13px] font-bold">Ships from</span>
                      <input value={shipsFrom} disabled={!canEdit} onChange={(e) => setShipsFrom(e.target.value)} maxLength={80} placeholder="Chiang Mai, Thailand" className="mt-1 w-full rounded-xl bg-white/80 px-3 py-2.5 text-sm ring-1 ring-sage-900/15" />
                    </label>
                    <label className="block">
                      <span className="text-[13px] font-bold">Ships to</span>
                      <input value={shipsTo} disabled={!canEdit} onChange={(e) => setShipsTo(e.target.value)} maxLength={80} placeholder="All of Thailand" className="mt-1 w-full rounded-xl bg-white/80 px-3 py-2.5 text-sm ring-1 ring-sage-900/15" />
                    </label>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold">Where you ship from, on the map</p>
                    <p className="mb-2 text-[12px] text-sage-900">Tap the map. It isn&apos;t shown as a pin; it lets customers and cafés find the nearest shop.{shipsPin ? "" : " Not set yet."}</p>
                    <PinPicker pin={shipsPin} onPick={setShipsPin} disabled={!canEdit} />
                  </div>
                </div>
              )}
              {!inStore && !online && <p className="rounded-xl bg-terra-100 p-2.5 text-[12.5px] text-terra-800">Pick at least one channel.</p>}
            </section>
          )}
        </div>
        {desktop && <div className="sticky top-24 space-y-4">{status}{preview}</div>}
      </div>

      {canEdit && (
        <div className="fixed inset-x-0 bottom-[4.5rem] z-40 px-5 md:px-8 lg:sticky lg:bottom-4 lg:px-0">
          <div className="mx-auto flex max-w-[720px] items-center gap-3 rounded-full bg-white/90 p-1.5 pl-4 shadow-[0_8px_30px_rgba(39,46,27,0.18)] ring-1 ring-sage-900/10 backdrop-blur lg:mx-0 lg:max-w-none">
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-sage-900">{err ? <span className="text-terra-800">{err}</span> : dirty ? "You have unsaved changes" : live && setup.unpublishedChanges ? "Draft saved, not public yet" : <span className="flex items-center gap-1"><Check size={14} strokeWidth={2.6} /> {live ? "Saved and published" : "Saved"}</span>}</span>
            <button onClick={save} disabled={saving || !dirty} className={`rounded-full px-5 py-2.5 text-sm font-bold disabled:opacity-50 ${live ? "border-[1.5px] border-sage-900/20 bg-white" : "bg-terra-500 text-cream"}`}>{saving ? "Saving…" : live ? "Save draft" : "Save"}</button>
            {live && <button onClick={() => { setErr(""); setPublishing(true); }} disabled={saving || !canPublish} title={setup.publishedToday ? "You can publish again tomorrow" : undefined} className="rounded-full bg-terra-500 px-5 py-2.5 text-sm font-bold text-cream disabled:opacity-50">Publish…</button>}
          </div>
        </div>
      )}
      {publishing && live && (
        <PublishSheet placeId={id} placeName={setup.place.name} rating={live} open={open} unsaved={dirty} version={(pub?.version ?? 0) + 1} onClose={() => setPublishing(false)} onPublish={publish} onRetryProof={retryProof} />
      )}
    </div>
  );
}
