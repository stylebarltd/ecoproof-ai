import { notFound } from "next/navigation";
import { getPlace, toPublic } from "@/lib/stampPlaces";
import ClaimStamp from "@/components/ClaimStamp";

export const dynamic = "force-dynamic";

/** What a customer lands on after scanning the place QR or tapping its link. */
export default async function Claim({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ src?: string }> }) {
  const place = await getPlace((await params).id);
  const viaQr = (await searchParams).src === "qr"; // the place's QR / link carries ?src=qr; opening the page from the passport or the map does not
  if (!place) notFound();
  if (place.kind === "online") return <div className="pt-16 text-center"><h1 className="text-2xl">{place.name}</h1><p className="mx-auto mt-2 max-w-xs text-sm text-neutral-600">This is an online shop. Collect your stamp with the card in your parcel or the link in your order email.</p></div>;
  if (place.status !== "active") return <div className="pt-16 text-center"><h1 className="text-2xl">{place.name}</h1><p className="mx-auto mt-2 max-w-xs text-sm text-neutral-600">{place.status === "suspended" ? "This place is no longer part of EcoProof." : "This place is paused while we review it, so stamps can't be collected right now."}</p></div>;
  return <ClaimStamp place={toPublic(place)} viaQr={viaQr} />;
}
