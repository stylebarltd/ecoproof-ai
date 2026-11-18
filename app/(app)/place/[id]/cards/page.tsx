import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { journalFonts } from "@/components/landing/fonts";
import { ParcelCard, parcelCardCss } from "@/components/Postcard";
import { qrImage } from "@/lib/qrImage";
import PrintButton from "@/components/PrintButton";
import { cardUrl } from "@/lib/cards";
import { query } from "@/lib/db";
import { roleAt } from "@/lib/members";
import { getSession } from "@/lib/session";
import { getPlace, toPublic } from "@/lib/stampPlaces";

export const dynamic = "force-dynamic";
export const metadata = { title: "Print parcel cards | EcoProof", robots: { index: false } };

/**
 * Print sheets for a batch of claim cards (parcel inserts): business-card size (components/Postcard.tsx, ParcelCard), ten on an A4
 * sheet, each with its own single-use QR and code. Small on purpose: a green shop adds as little paper to a parcel as it can.
 * The codes are secrets: it needs ?token=<ADMIN_TOKEN> or someone who runs the place (owner or staff), signed in.
 */
const PER_SHEET = 10;

export default async function CardSheet({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ batch?: string; token?: string }> }) {
  const { id } = await params;
  const { batch, token } = await searchParams;
  const place = await getPlace(id);
  const isAdmin = !!process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
  const session = await getSession(await headers());
  if (!isAdmin && !(place && session && (await roleAt(place.id, session.keys)))) notFound(); // admin token, or someone who runs the place, signed in
  if (!place || !batch) notFound();
  const p = toPublic(place);
  const rows = await query<{ code: string }>("SELECT code FROM claim_cards WHERE place_id=$1 AND batch=$2 ORDER BY created_at, code", [id, batch]);
  if (!rows.length) notFound();
  const cards = await Promise.all(rows.map(async (r) => (
    <ParcelCard key={r.code} place={place.name} qr={await qrImage(cardUrl(r.code))} code={`${r.code.slice(0, 5)}-${r.code.slice(5)}`} />
  )));
  const sheets = Array.from({ length: Math.ceil(cards.length / PER_SHEET) }, (_, i) => cards.slice(i * PER_SHEET, (i + 1) * PER_SHEET));

  return (
    <div className={`${journalFonts} lg:mx-auto lg:max-w-[720px]`}>
      <style>{parcelCardCss()}</style>
      <div className="no-print mb-4 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-[22px] leading-tight">Cards for your parcels</h1>
            <p className="text-[13px] text-sage-900">{cards.length} card{cards.length > 1 ? "s" : ""} for {p.name}, on {sheets.length} sheet{sheets.length > 1 ? "s" : ""}. Each has its own code and works once, so print every card only once. Below is the first one.</p>
          </div>
          <PrintButton />
        </div>
        <p className="text-[12px] leading-snug text-sage-900">
          Business-card size (85 × 55 mm), ten on a sheet, to keep paper low: cut along the dashed lines. In the print dialog choose A4, margins &ldquo;None&rdquo; and turn on
          &ldquo;Background graphics&rdquo;. Recycled paper or card works well.
        </p>
      </div>
      {sheets.map((s, i) => <div key={i} className="sheet">{s}</div>)}
    </div>
  );
}
