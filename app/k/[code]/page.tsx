import { getCard } from "@/lib/cards";
import { getPlace, toPublic } from "@/lib/stampPlaces";
import ClaimStamp from "@/components/ClaimStamp";

export const dynamic = "force-dynamic";

/** Landing page of a printed claim card (tap the link or scan the QR). */
export default async function CardClaim({ params }: { params: Promise<{ code: string }> }) {
  const card = await getCard((await params).code);
  const place = card ? await getPlace(card.place_id) : null;
  if (!card || !place) return <div className="pt-16 text-center"><h1 className="text-2xl">This card isn&apos;t valid</h1><p className="mt-2 text-sm text-neutral-600">Check the code on your card and try again.</p></div>;
  if (card.claimed_at) return <div className="pt-16 text-center"><h1 className="text-2xl">This card has been used</h1><p className="mt-2 text-sm text-neutral-600">Each card gives one stamp, once.</p></div>;
  return <ClaimStamp place={toPublic(place)} cardCode={card.code} />;
}
