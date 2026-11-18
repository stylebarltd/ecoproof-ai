import Link from "next/link";
import { notFound } from "next/navigation";
import { journalFonts } from "@/components/landing/fonts";
import Postcard, { counterCard, postcardCss } from "@/components/Postcard";
import PrintButton from "@/components/PrintButton";
import { declarationsOf, publishedAnswers } from "@/lib/declarations";
import { rating } from "@/lib/practices";
import { qrImage } from "@/lib/qrImage";
import { getPlace, toPublic } from "@/lib/stampPlaces";

export const dynamic = "force-dynamic";
export const metadata = { title: "Print your postcard | EcoProof", robots: { index: false } };

/**
 * The place's postcard for the counter or the table: what EcoProof is, why to scan, and the claim QR (components/Postcard.tsx). A
 * customer who has never heard of EcoProof should understand it without asking. Prints as four A6 postcards on one A4 sheet (cut once
 * each way), or as one A4 poster (?size=a4).
 */
export default async function PlacePostcard({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ size?: string }> }) {
  const place = await getPlace((await params).id);
  if (!place) notFound();
  const poster = (await searchParams).size === "a4";
  const p = toPublic(place);
  const r = rating(place.kind, place.also_cafe, publishedAnswers(place, (await declarationsOf(place.id))[0]));
  const card = <Postcard {...counterCard(p, await qrImage(p.claimUrl), r?.stars)} />;

  const tab = (on: boolean) => `rounded-full px-3 py-1.5 text-xs font-bold ${on ? "bg-sage-500 text-cream" : "text-sage-900"}`;
  return (
    <div className={`${journalFonts} lg:mx-auto lg:max-w-[720px]`}>
      <style>{postcardCss(poster ? { cols: 1, rows: 1 } : { cols: 2, rows: 2 })}</style>
      <div className="no-print mb-4 space-y-3">
        <div>
          <h1 className="text-[22px] leading-tight">Your postcard</h1>
          <p className="text-[13px] text-sage-900">Put it on the counter or the tables. It tells customers what EcoProof is, so they know why to scan.</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="glass flex rounded-full p-1" role="group" aria-label="Print size">
            <Link href={`/place/${place.id}`} replace scroll={false} aria-current={!poster} className={tab(!poster)}>4 postcards (A6)</Link>
            <Link href={`/place/${place.id}?size=a4`} replace scroll={false} aria-current={poster} className={tab(poster)}>1 poster (A4)</Link>
          </div>
          <PrintButton />
        </div>
        <p className="text-[12px] leading-snug text-sage-900">
          {poster ? "One poster fills an A4 sheet." : "One A4 sheet gives four postcards: cut it once across and once down."} In the print dialog choose A4, margins
          &ldquo;None&rdquo; and turn on &ldquo;Background graphics&rdquo;. Thick paper (200 g or more) stands up best.
        </p>
      </div>
      <div className="sheet">
        {card}
        {!poster && <>{card}{card}{card}</>}
      </div>
    </div>
  );
}
