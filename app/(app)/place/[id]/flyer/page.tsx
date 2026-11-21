import { notFound } from "next/navigation";
import { journalFonts } from "@/components/landing/fonts";
import { ParcelFlyer, postcardCss } from "@/components/Postcard";
import PrintButton from "@/components/PrintButton";
import { getPlace, toPublic } from "@/lib/stampPlaces";

export const dynamic = "force-dynamic";
export const metadata = { title: "Print your parcel flyer | EcoProof", robots: { index: false } };

/**
 * The parcel flyer of an online shop that uses the plugin (components/Postcard.tsx, ParcelFlyer): four A6 flyers on one A4 sheet. It has
 * no QR code, so it holds no secret and needs no sign-in, like the counter postcard: it tells the customer to open the order email, where
 * the personal stamp link is. Parcels of marketplace orders get a parcel card instead (../cards), never both (Pola, 2026-11-20).
 */
export default async function PlaceFlyer({ params }: { params: Promise<{ id: string }> }) {
  const place = await getPlace((await params).id);
  if (!place || !place.sells_online) notFound();
  const flyer = <ParcelFlyer place={toPublic(place)} />;
  return (
    <div className={`${journalFonts} lg:mx-auto lg:max-w-[720px]`}>
      <style>{postcardCss({ cols: 2, rows: 2 })}</style>
      <div className="no-print mb-4 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-[22px] leading-tight">Your parcel flyer</h1>
            <p className="text-[13px] text-sage-900">For parcels of orders from your own shop, where the plugin sends the stamp by email. It tells the customer to open that email. It has no code on it, so print as many as you like.</p>
          </div>
          <PrintButton />
        </div>
        <p className="text-[12px] leading-snug text-sage-900">
          One A4 sheet gives four flyers (A6): cut it once across and once down. In the print dialog choose A4, margins &ldquo;None&rdquo; and turn on &ldquo;Background graphics&rdquo;.
          Parcels of orders from Amazon, Lazada or Shopee get a parcel card instead, not this flyer.
        </p>
      </div>
      <div className="sheet">{flyer}{flyer}{flyer}{flyer}</div>
    </div>
  );
}
