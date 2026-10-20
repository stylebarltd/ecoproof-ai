import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ExternalLink, Globe, Link2, MapPin, Truck } from "lucide-react";
import AnchorPending from "@/components/AnchorPending";
import ShopImpact from "@/components/ShopImpact";
import Stars from "@/components/Stars";
import VerifyButton from "@/components/VerifyButton";
import { declarationsOf, publishedAnswers, toDeclaration } from "@/lib/declarations";
import { isShop, kindOf } from "@/lib/placeKinds";
import { shopImpact } from "@/lib/shops";
import { checklist, rating } from "@/lib/practices";
import { getPlace, toPublic, type StampPlace } from "@/lib/stampPlaces";

export const dynamic = "force-dynamic";

const visible = (p: StampPlace | null): p is StampPlace => !!p && p.status === "active";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const place = await getPlace((await params).id);
  return { title: visible(place) ? `${place.name} | EcoProof` : "Place | EcoProof" };
}

/** A place's public page: its stars, and the eco practices its owner declared (the latest published declaration), with its Solana proof. */
export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const place = await getPlace((await params).id);
  if (!visible(place)) notFound();
  const p = toPublic(place);
  const history = await declarationsOf(place.id);
  const answers = publishedAnswers(place, history[0]);
  const current = history[0] && history[0].kind === place.kind && history[0].also_cafe === place.also_cafe ? toDeclaration(history[0]) : null;
  const shop = isShop(place.kind) ? { impact: (await shopImpact([place.id])).get(place.id)!, online: p.online } : null;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
  const groups = checklist(place.kind, place.also_cafe);
  const r = rating(place.kind, place.also_cafe, answers);
  const kept = groups?.map((g) => ({ ...g, items: g.items.filter((i) => answers[i.id] === "yes") })).filter((g) => g.items.length) ?? [];
  const answered = groups ? groups.some((g) => g.items.some((i) => answers[i.id])) : false;

  return (
    <div className="space-y-4 lg:mx-auto lg:max-w-[880px] lg:space-y-6">
      <section className="glass rounded-[28px] p-4 lg:p-6">
        <div className="flex items-start gap-3 lg:gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.imageUrl} alt="" width={88} height={88} className="h-16 w-16 shrink-0 lg:h-[88px] lg:w-[88px]" />
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] leading-tight lg:text-[32px]">{place.name}</h1>
            <p className="text-[13px] text-sage-900">{kindOf(place.kind)?.label ?? "Place"}{place.kind === "restaurant" && place.also_cafe ? " and café" : ""}{shop ? ` · ${[p.inStore && "in store", p.online && "online"].filter(Boolean).join(" and ")}` : ""}{place.demo ? " · demo place" : ""}</p>
            {place.address && <p className="mt-1 flex items-start gap-1 text-[13px] text-sage-900"><MapPin size={14} strokeWidth={2.5} className="mt-0.5 shrink-0" /> {place.address}</p>}
            {place.tagline && <p className="mt-1.5 text-sm">{place.tagline}</p>}
          </div>
        </div>

        {r && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/60 p-3 lg:p-4">
            <div className="flex items-center gap-3">
              <Stars stars={r.stars} size={24} />
              <span><span className="block font-heading text-[18px] leading-none">{r.stars ? `${r.stars} eco star${r.stars === 1 ? "" : "s"}` : r.label}</span><span className="text-[11.5px] text-sage-900">{r.score} of 100 points</span></span>
            </div>
            <Link href="/rules#stars" className="text-xs font-bold text-sage-800 underline">How stars work</Link>
          </div>
        )}

        {shop && (
          <div className="mt-4 rounded-2xl bg-white/60 p-3 lg:p-4">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-sage-900">What customers saved here</p>
            <ShopImpact impact={shop.impact} />
          </div>
        )}
        {shop?.online && (place.website || place.ships_from || place.ships_to) && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-sage-900">
            {(place.ships_from || place.ships_to) && <span className="flex items-center gap-1.5"><Truck size={15} strokeWidth={2.5} /> {place.ships_from ? `Ships from ${place.ships_from}` : "Ships"}{place.ships_to ? ` to ${place.ships_to}` : ""}</span>}
            {place.website && <a href={place.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-bold underline"><Globe size={15} strokeWidth={2.5} /> Visit the online shop</a>}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {place.in_store && <Link href={`/c/${place.id}`} className="lift rounded-full bg-terra-500 px-4 py-2.5 text-sm font-bold text-cream">{place.demo ? "Collect a stamp (demo)" : "How to collect a stamp here"}</Link>}
          {place.in_store && <Link href={`/map?place=${place.id}`} className="glass rounded-full px-4 py-2.5 text-sm font-bold">Show on the map</Link>}
        </div>
      </section>

      {groups && (
        <section className="space-y-3">
          <h2 className="px-1 text-[17px]">What {place.name} does</h2>
          {kept.length ? (
            <div className="gap-3 space-y-3 lg:columns-2 lg:space-y-0 [&>*]:break-inside-avoid lg:[&>*]:mb-3">
              {kept.map((g) => (
                <div key={g.id} className="glass rounded-[24px] p-4">
                  <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-sage-900">{g.label}</h3>
                  <ul className="space-y-2">
                    {g.items.map((i) => (
                      <li key={i.id} className="flex items-start gap-2 text-[14px] leading-snug">
                        <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-sage-500 text-cream"><Check size={12} strokeWidth={3} /></span>
                        {i.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="glass rounded-[24px] p-4 text-sm">{answered ? "None of the practices on our checklist yet." : "The owner hasn't published the eco checklist yet."}</p>
          )}
        </section>
      )}

      {current && (
        <section className="glass space-y-3 rounded-[24px] p-4 lg:p-5">
          <h2 className="flex items-center gap-1.5 text-[17px]"><Link2 size={17} strokeWidth={2.5} /> Declared on the blockchain</h2>
          <p className="text-[13px] leading-snug">
            {place.name} published these practices on {fmt(current.createdAt)} (declaration {current.version}). A fingerprint of the answers was written to Solana,
            so nobody, not even EcoProof, can change what was declared without it showing.
          </p>
          {current.pending ? <AnchorPending id={current.id} /> : (
            <>
              <a href={current.txUrl!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-bold text-sage-800 underline">See the transaction on Solana Explorer <ExternalLink size={12} /></a>
              <VerifyButton id={current.id} kind="declaration" />
            </>
          )}
          {history.length > 1 && (
            <details className="text-[12.5px]">
              <summary className="cursor-pointer font-bold text-sage-800">Earlier declarations ({history.length - 1})</summary>
              <ul className="mt-2 space-y-1.5">
                {history.slice(1).map(toDeclaration).map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>Declaration {d.version} · {fmt(d.createdAt)} · {kindOf(d.kind)?.label ?? d.kind}</span>
                    <Stars stars={d.stars} size={12} />
                    {d.txUrl ? <a href={d.txUrl} target="_blank" rel="noreferrer" className="underline">proof</a> : <span className="text-sage-900">proof pending</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      <p className="px-1 text-[12px] leading-relaxed text-sage-900">
        {groups ? "The owner declares these practices; EcoProof doesn't inspect places in person yet. " : "Eco shops don't get stars: they show what their customers saved, from verified purchases. "}
        Something not true? <Link href={`/report/${place.id}`} className="font-bold underline">Report this place</Link>.
      </p>
    </div>
  );
}
