"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ExternalLink, Loader2, Sparkles } from "lucide-react";
import AccountChip from "@/components/AccountChip";
import Stars from "@/components/Stars";
import { useAccountChange, useDesktop } from "@/lib/desktop";
import { PLACE_KINDS, isPhysical, kindOf } from "@/lib/placeKinds";
import { PRACTICES, checklist, nextStar, rating, type Answers, type Status } from "@/lib/practices";
import type { Role } from "@/lib/members";
import type { PublicPlace } from "@/lib/stampPlaces";

// The owner's eco checklist: place type, address, and Yes / No / Not applicable per practice (data/practices.json), with the stars
// they earn updating live, and the easiest practices to reach the next star. Staff see it read-only.

type Setup = { place: PublicPlace; role: Role; kind: string; alsoCafe: boolean; address: string | null; answers: Answers };

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
  const [answers, setAnswers] = useState<Answers>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null); // JSON of what is saved, to tell unsaved changes apart
  const [err, setErr] = useState("");
  const desktop = useDesktop();

  const apply = (s: Setup) => {
    setSetup(s); setKind(s.kind); setAlsoCafe(s.alsoCafe); setAddress(s.address ?? ""); setAnswers(s.answers);
    setSaved(JSON.stringify({ kind: s.kind, alsoCafe: s.alsoCafe, address: s.address ?? "", answers: s.answers }));
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
  const dirty = saved !== JSON.stringify({ kind, alsoCafe, address, answers });
  const canEdit = setup?.role === "owner";
  const open = groups ? groups.flatMap((g) => g.items).filter((p) => !answers[p.id]).length : 0;

  async function save() {
    setSaving(true); setErr("");
    try {
      // Only answers for the current checklist are sent; others stay stored for if the type is switched back.
      const ids = new Set(groups?.flatMap((g) => g.items.map((p) => p.id)) ?? []);
      const r = await fetch(`/api/places/mine/${id}/practices`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, alsoCafe, address, answers: Object.fromEntries(Object.entries(answers).filter(([k]) => ids.has(k))) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Couldn't save.");
      apply({ ...setup!, ...j });
    } catch (e) { setErr(e instanceof Error ? e.message : "Couldn't save."); }
    setSaving(false);
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

  const kinds = PLACE_KINDS.filter((k) => k.physical === isPhysical(setup.kind));
  const type = PRACTICES.placeTypes[kind];

  const preview = live && (
    <section className="glass rounded-[28px] p-4 lg:p-5" aria-live="polite">
      <p className="text-[11.5px] font-bold uppercase tracking-wide text-sage-900">Your rating {dirty && canEdit ? "· not saved yet" : ""}</p>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <Stars stars={live.stars} size={desktop ? 26 : 22} />
        <span className="text-right"><span className="block font-heading text-[22px] leading-none">{live.stars ? `${live.stars} star${live.stars === 1 ? "" : "s"}` : live.label}</span><span className="text-[11.5px] text-sage-900">{live.score} of 100 points</span></span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-honey-500 transition-all" style={{ width: `${live.score}%` }} /></div>
      {open > 0 && <p className="mt-2 text-[11.5px] text-sage-900">{open} practice{open === 1 ? "" : "s"} not answered yet. Unanswered counts as no.</p>}
      {next ? (
        <div className="mt-3 rounded-2xl bg-white/60 p-3">
          <p className="flex items-center gap-1.5 text-[13px] font-bold"><Sparkles size={15} strokeWidth={2.5} className="text-honey-700" /> Next easiest star: {next.stars} star{next.stars === 1 ? "" : "s"}</p>
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

  return (
    <div className="space-y-4 pb-24 lg:space-y-6 lg:pb-8">
      {header}
      <div>
        <h1 className="text-[24px] leading-tight lg:text-[30px]">Eco practices and stars</h1>
        <p className="mt-1 text-[13px] text-sage-900">Tick what your place really does. Visitors see it on your public page, and can report anything that isn&apos;t true.</p>
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
            {isPhysical(kind) && (
              <label className="block">
                <span className="text-[13px] font-bold">Address</span>
                <input value={address} disabled={!canEdit} onChange={(e) => setAddress(e.target.value)} maxLength={200} placeholder="Street, area, city" className="mt-1 w-full rounded-xl bg-white/80 px-3 py-2.5 text-sm ring-1 ring-sage-900/15" />
              </label>
            )}
          </section>

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
            <section className="glass rounded-[28px] p-4 text-sm lg:p-5">
              <p className="font-bold">{kindOf(kind)?.label}s are listed without stars.</p>
              <p className="mt-1 text-sage-900">{kind === "online_shop" ? "Online shops appear in EcoProof without a map pin. Customers collect stamps from their order email or parcel card." : "Eco shops appear on the map without a star rating. Stars are for cafés, restaurants and hotels."}</p>
            </section>
          )}
        </div>
        {desktop && <div className="sticky top-24">{preview}</div>}
      </div>

      {canEdit && (
        <div className="fixed inset-x-0 bottom-[4.5rem] z-40 px-5 md:px-8 lg:sticky lg:bottom-4 lg:px-0">
          <div className="mx-auto flex max-w-[720px] items-center gap-3 rounded-full bg-white/90 p-1.5 pl-4 shadow-[0_8px_30px_rgba(39,46,27,0.18)] ring-1 ring-sage-900/10 backdrop-blur lg:mx-0 lg:max-w-none">
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-sage-900">{err ? <span className="text-terra-800">{err}</span> : dirty ? "You have unsaved changes" : <span className="flex items-center gap-1"><Check size={14} strokeWidth={2.6} /> Saved</span>}</span>
            <button onClick={save} disabled={saving || !dirty} className="rounded-full bg-terra-500 px-5 py-2.5 text-sm font-bold text-cream disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
