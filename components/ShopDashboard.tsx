"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Check, ChevronRight, Copy, ExternalLink, Leaf, ListChecks, Loader2, QrCode, Sparkles, ShoppingBag, Ticket, UserPlus, Users } from "lucide-react";
import ShopImpact from "@/components/ShopImpact";
import CopySnippet from "@/components/landing/CopySnippet";
import Stars from "@/components/Stars";
import AccountChip from "@/components/AccountChip";
import { PlaceCard, type MyPlace } from "@/components/ShopTools";
import { useAccountChange, useDesktop } from "@/lib/desktop";
import { isShop, kindOf } from "@/lib/placeKinds";
import { explorerTx } from "@/lib/passportView";
import type { ShopActivity, Source } from "@/lib/shopActivity";
import type { Member, Role } from "@/lib/members";

// The shop dashboard: what customers did (stamps, how they were collected, impact, proofs), the place's stamp tools, and the team.

type Data = { place: MyPlace; role: Role; activity: ShopActivity; badge: { url: string; embed: string } | null };
type Team = { role: Role; members: Member[]; invites: { role: Role; expiresAt: string }[] };

const SOURCES: { key: Source; label: string; color: string; icon: typeof QrCode }[] = [
  { key: "qr", label: "QR scans", color: "#8fa073", icon: QrCode },
  { key: "card", label: "Printed cards", color: "#e8a317", icon: Ticket },
  { key: "order", label: "Verified orders", color: "#d67f48", icon: ShoppingBag },
];
const sourceOf = (k: Source) => SOURCES.find((s) => s.key === k)!;
const nf = (n: number) => n.toLocaleString("en-US");
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

const Panel = ({ title, aside, children, className = "" }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <section className={`glass rounded-[28px] p-4 lg:p-5 ${className}`}>
    <div className="mb-3 flex items-baseline justify-between gap-2">
      <h2 className="text-[17px] leading-tight">{title}</h2>
      {aside}
    </div>
    {children}
  </section>
);

function Stat({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: typeof QrCode }) {
  return (
    <div className="glass rounded-[22px] p-3.5">
      <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-sage-900"><Icon size={14} strokeWidth={2.5} className="text-sage-700" /> {label}</p>
      <p className="mt-1 font-heading text-[28px] leading-none tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-[11.5px] leading-snug text-sage-900">{sub}</p>}
    </div>
  );
}

/** Stamps per day, stacked by how they were collected. One scale for every bar; the tallest day sets it. */
function DailyChart({ series }: { series: ShopActivity["series"] }) {
  const max = Math.max(1, ...series.map((d) => d.qr + d.card + d.order));
  const W = 640, H = 150, pad = 18, gap = series.length > 40 ? 1 : 3;
  const bw = (W - pad) / series.length - gap;
  const ticks = max <= 4 ? Array.from({ length: max + 1 }, (_, i) => i) : [0, Math.round(max / 2), max];
  const label = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="h-auto w-full" role="img" aria-label="Stamps per day">
        {ticks.map((t) => {
          const y = H - (t / max) * (H - 8);
          return (
            <g key={t}>
              <line x1={pad} x2={W} y1={y} y2={y} stroke="#272e1b" strokeOpacity={0.12} />
              <text x={0} y={y + 3} fontSize={10} fill="#3d472b">{t}</text>
            </g>
          );
        })}
        {series.map((d, i) => {
          let y = H;
          const x = pad + i * (bw + gap);
          return (
            <g key={d.day}>
              <title>{`${label(d.day)}: ${d.qr + d.card + d.order} stamps`}</title>
              {SOURCES.map((s) => {
                const h = (d[s.key] / max) * (H - 8);
                y -= h;
                return h > 0 ? <rect key={s.key} x={x} y={y} width={bw} height={h} rx={Math.min(3, bw / 2)} fill={s.color} /> : null;
              })}
            </g>
          );
        })}
        <text x={pad} y={H + 14} fontSize={10} fill="#3d472b">{label(series[0].day)}</text>
        <text x={W} y={H + 14} fontSize={10} fill="#3d472b" textAnchor="end">Today</text>
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-sage-900">
        {SOURCES.map((s) => <li key={s.key} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{s.label}</li>)}
      </ul>
    </div>
  );
}

function Rate({ label, done, total, empty }: { label: string; done: number; total: number; empty: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums text-sage-900">{total ? `${nf(done)} of ${nf(total)} · ${pct}%` : empty}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/60"><div className="h-full rounded-full bg-honey-500" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function TeamPanel({ placeId, onLeft }: { placeId: string; onLeft: () => void }) {
  const [t, setT] = useState<Team | null>(null);
  const [link, setLink] = useState<{ role: Role; url: string } | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmHandover, setConfirmHandover] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch(`/api/places/mine/${placeId}/team`, { cache: "no-store" });
    if (r.ok) setT(await r.json());
  }, [placeId]);
  useEffect(() => { const init = async () => { await load(); }; init(); }, [load]);
  async function post(body: object) {
    setErr("");
    const r = await fetch(`/api/places/mine/${placeId}/team`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Something went wrong");
    return j;
  }
  const invite = (role: Role) => async () => {
    try { const j = await post({ action: "invite", role }); setLink({ role, url: j.url }); setCopied(false); setConfirmHandover(false); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Couldn't make the link"); }
  };
  const remove = (m: Member) => async () => {
    try { await post({ action: "remove", key: m.key }); if (m.you) onLeft(); else await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Couldn't remove"); }
  };
  const owner = t?.role === "owner";
  return (
    <Panel title="Team" aside={<Users size={18} strokeWidth={2.4} className="text-sage-700" />}>
      {!t ? <Loader2 size={18} className="animate-spin text-sage-700" /> : (
        <>
          <ul className="space-y-2">
            {t.members.map((m) => (
              <li key={m.key} className="flex items-center gap-3 rounded-2xl bg-white/55 p-2.5 ring-1 ring-white/70">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{m.label}{m.you && <span className="font-normal text-sage-900"> (you)</span>}</span>
                  {m.detail && <span className="block truncate text-xs text-sage-900">{m.detail}</span>}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${m.role === "owner" ? "bg-honey-500 text-ink" : "bg-sage-200 text-sage-800"}`}>{m.role === "owner" ? "Owner" : "Staff"}</span>
                {(owner || m.you) && !(m.role === "owner" && t.members.filter((x) => x.role === "owner").length <= 1) && (
                  <button onClick={remove(m)} className="text-xs font-bold text-terra-700 underline">{m.you ? "Leave" : "Remove"}</button>
                )}
              </li>
            ))}
          </ul>
          {t.invites.length > 0 && <p className="mt-2 text-xs text-sage-900">{t.invites.length} invite link{t.invites.length === 1 ? "" : "s"} waiting to be used (valid for 7 days).</p>}
          {owner ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs leading-snug text-sage-900">Staff can show the QR code, print cards and see customer activity. They can&apos;t change the shop&apos;s settings or see its secret.</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={invite("staff")} className="lift flex items-center gap-1.5 rounded-full bg-sage-500 px-4 py-2 text-sm font-bold text-cream"><UserPlus size={15} strokeWidth={2.5} /> Invite staff</button>
                <button onClick={() => setConfirmHandover(true)} className="glass rounded-full px-4 py-2 text-sm font-bold">Hand over this place</button>
              </div>
              {confirmHandover && (
                <div className="space-y-2 rounded-2xl bg-terra-100 p-3 text-sm text-terra-800">
                  <p>Make a link for the new owner. When they open it and sign in, the place becomes theirs and you stay on as staff (you can leave afterwards).</p>
                  <div className="flex gap-2">
                    <button onClick={invite("owner")} className="rounded-full bg-terra-500 px-4 py-2 font-bold text-cream">Make handover link</button>
                    <button onClick={() => setConfirmHandover(false)} className="glass rounded-full px-4 py-2 font-bold text-ink">Cancel</button>
                  </div>
                </div>
              )}
              {link && (
                <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-white/80">
                  <p className="text-xs font-bold">{link.role === "owner" ? "Handover link for the new owner" : "Invite link for your staff member"}: send it to them. It works once, for 7 days.</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2 py-1.5 text-xs ring-1 ring-neutral-300">{link.url}</code>
                    <button onClick={() => navigator.clipboard?.writeText(link.url).then(() => setCopied(true), () => {})} className="glass flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold">
                      {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2.5} />} {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : <p className="mt-3 text-xs text-sage-900">Only the owner can invite people or hand the place over.</p>}
          {err && <p className="mt-2 rounded-xl bg-terra-100 p-2.5 text-sm text-terra-800">{err}</p>}
        </>
      )}
    </Panel>
  );
}

export default function ShopDashboard({ id }: { id: string }) {
  const [days, setDays] = useState(30);
  const [showAll, setShowAll] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "signin" | "missing">("loading");
  const desktop = useDesktop();
  const router = useRouter();

  const load = useCallback(async () => {
    const r = await fetch(`/api/places/mine/${id}/activity?days=${days}`, { cache: "no-store" });
    if (r.status === 401) { setState("signin"); return; }
    if (!r.ok) { setState("missing"); return; }
    setData(await r.json()); setState("ready");
  }, [id, days]);
  useEffect(() => { const init = async () => { await load(); }; init(); }, [load]);
  useAccountChange(load);

  const header = (
    <div className="flex items-center justify-between gap-2">
      <Link href="/shop" className="flex items-center gap-1 text-sm font-bold text-sage-800"><ArrowLeft size={16} strokeWidth={2.5} /> My shop</Link>
      {!desktop && <AccountChip onChange={load} />}
    </div>
  );
  if (state !== "ready" || !data) {
    return (
      <div className="space-y-4 lg:mx-auto lg:max-w-[720px]">
        {header}
        {state === "loading" ? <Loader2 size={24} className="mx-auto animate-spin text-sage-700" /> : (
          <p className="glass rounded-[22px] p-4 text-sm">{state === "signin" ? "Sign in to see your place." : "This place isn't one you run. Check you're signed in with the right account."}</p>
        )}
      </div>
    );
  }

  const { place, role, activity: a } = data;
  const placeForTools = { ...place, role };
  return (
    <div className="space-y-4 lg:space-y-6">
      {header}
      <div className="flex items-center gap-3 lg:gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={place.imageUrl} alt="" width={64} height={64} className="h-14 w-14 shrink-0 lg:h-16 lg:w-16" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px] leading-tight lg:text-[30px]">{place.name}</h1>
          <p className="text-[13px] text-sage-900">{kindOf(place.kind)?.label ?? place.kind} · {role === "owner" ? "You're the owner" : "You're staff"}</p>
        </div>
      </div>
      {place.status && place.status !== "active" && (
        <p className="rounded-2xl bg-terra-100 p-3 text-sm text-terra-800">{place.status === "suspended" ? "This place was removed from EcoProof." : "This place is paused while we review reports."} {place.statusNote}</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[17px] leading-tight">Customer activity</h2>
        <div className="glass flex rounded-full p-1 text-xs font-bold" role="group" aria-label="Period">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)} aria-pressed={days === d} className={`whitespace-nowrap rounded-full px-2.5 py-1.5 lg:px-3 ${days === d ? "bg-sage-500 text-cream" : "text-sage-900"}`}>{d} days</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={BadgeCheck} label="Stamps" value={nf(a.stamps)} sub={SOURCES.filter((s) => a.bySource[s.key] > 0).map((s) => `${nf(a.bySource[s.key])} ${s.key === "qr" ? "QR scans" : s.label.toLowerCase()}`).join(" · ") || "none yet"} />
        <Stat icon={Users} label="Customers" value={nf(a.customers)} sub={`${nf(a.newCustomers)} new · ${nf(a.returningCustomers)} returning`} />
        <Stat icon={Leaf} label="Impact" value={`${a.impact.co2Kg} kg`} sub={`CO₂ saved · ${nf(a.impact.plasticItems)} plastic items avoided, from ${nf(a.impact.verifiedPurchases)} verified purchase${a.impact.verifiedPurchases === 1 ? "" : "s"}`} />
        <Stat icon={Sparkles} label="Bee Guardians" value={nf(a.beeGuardians)} sub="unlocked by a stamp collected here" />
      </div>

      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-6 lg:space-y-0">
        <div className="space-y-4 lg:space-y-6">
          <Panel title="Stamps per day" aside={<span className="text-xs text-sage-900">Thai time</span>}>
            {a.stamps ? <DailyChart series={a.series} /> : <p className="text-sm text-sage-900">No stamps in the last {days} days yet. Put your QR where customers see it, or print cards for your parcels.</p>}
          </Panel>
          <Panel title="Latest stamps" aside={<span className="text-xs text-sage-900">each one is anchored on Solana</span>}>
            {a.recent.length === 0 ? <p className="text-sm text-sage-900">Stamps show up here as customers collect them.</p> : (
              <div className="-mx-1 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-[13px]">
                  <thead><tr className="text-[11px] uppercase tracking-wide text-sage-900"><th className="px-1 pb-1.5 font-bold">When</th><th className="px-1 pb-1.5 font-bold">Customer</th><th className="px-1 pb-1.5 font-bold">How</th><th className="px-1 pb-1.5 font-bold">Impact</th><th className="px-1 pb-1.5 font-bold">Proof</th></tr></thead>
                  <tbody>
                    {(showAll ? a.recent : a.recent.slice(0, 10)).map((r) => {
                      const s = sourceOf(r.source);
                      return (
                        <tr key={r.id} className="border-t border-sage-900/10">
                          <td className="whitespace-nowrap px-1 py-2 tabular-nums">{when(r.at)}</td>
                          <td className="px-1 py-2 font-mono text-xs">#{r.customer}</td>
                          <td className="px-1 py-2"><span className="flex items-center gap-1.5"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />{s.label.replace(/s$/, "")}</span></td>
                          <td className="px-1 py-2 text-xs text-sage-900">{r.source === "order" ? `${r.co2Kg} kg CO₂ · ${r.plasticItems} plastic` : r.source === "qr" ? "Visit" : "–"}</td>
                          <td className="px-1 py-2">{r.signature ? <a href={explorerTx(r.signature)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-bold text-sage-800 underline">Explorer <ExternalLink size={11} /></a> : <span className="text-xs text-sage-900">pending</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!showAll && a.recent.length > 10 && <button onClick={() => setShowAll(true)} className="glass mt-2 w-full rounded-full py-2 text-xs font-bold">Show the last {a.recent.length}</button>}
            <p className="mt-2 text-[11.5px] text-sage-900">Customers stay anonymous: #codes are only for telling visits apart at your place.</p>
          </Panel>
        </div>
        <div className="space-y-4 lg:space-y-6">
          {place.impact && (
            <Panel title="What your customers saved" aside={<span className="text-xs text-sage-900">all time</span>}>
              <ShopImpact impact={place.impact} />
              <p className="mt-2 text-[11.5px] text-sage-900">This is what visitors see on your page and in the shop list, instead of stars.</p>
            </Panel>
          )}
          {data.badge && (
            <Panel title="Badge for your site" aside={<span className="text-xs text-sage-900">live</span>}>
              {/* eslint-disable-next-line @next/next/no-img-element -- an SVG served by our own route */}
              <img src={data.badge.url} alt="Your live impact badge" height={30} className="h-[30px] w-auto" />
              <p className="mt-2 text-[12px] leading-snug text-sage-900">Paste this where your customers can see it. The numbers are drawn from your proofs every few minutes, and a click opens your page with the proofs behind them.</p>
              <div className="mt-2"><CopySnippet code={data.badge.embed} /></div>
            </Panel>
          )}
          <Panel title="Turned into stamps" aside={<span className="text-xs text-sage-900">all time</span>}>
            <div className="space-y-3">
              <Rate label="Printed cards" done={a.cards.claimed} total={a.cards.printed} empty="none printed yet" />
              {place.online && <Rate label="Online orders" done={a.orders.claimed} total={a.orders.sent} empty="no orders sent yet" />}
            </div>
          </Panel>
          <Link href={`/shop/${place.id}/practices`} className="glass lift flex items-center gap-3 rounded-[28px] p-4 lg:p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sage-500 text-cream"><ListChecks size={22} strokeWidth={2.5} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-heading leading-tight">{place.stars ? "Eco practices" : "Shop settings"}</span>
              {place.stars ? (
                <span className="mt-0.5 flex items-center gap-2 text-[12px] text-sage-900"><Stars stars={place.stars.stars} size={14} /> {place.stars.answered ? `${place.stars.score} of 100 points` : "Fill in and publish your checklist to get stars"}</span>
              ) : <span className="block text-[12px] text-sage-900">{isShop(place.kind) ? `${[place.inStore && "In store", place.online && "Online"].filter(Boolean).join(" and ") || "No channel yet"} · type and address` : "Your place type and address"}</span>}
            </span>
            <ChevronRight size={20} strokeWidth={2.5} className="shrink-0 text-sage-700" />
          </Link>
          <TeamPanel placeId={place.id} onLeft={() => router.push("/shop")} />
        </div>
      </div>

      <section className="space-y-3 lg:mx-auto lg:max-w-[560px]">
        <h2 className="text-[17px]">Give out stamps</h2>
        <PlaceCard p={placeForTools} />
      </section>
    </div>
  );
}
