import { notFound } from "next/navigation";
import { getPlace, toPublic } from "@/lib/stampPlaces";
import ClaimStamp from "@/components/ClaimStamp";

export const dynamic = "force-dynamic";

/** What a customer lands on after scanning the place QR or tapping its link. */
export default async function Claim({ params }: { params: Promise<{ id: string }> }) {
  const place = await getPlace((await params).id);
  if (!place) notFound();
  return <ClaimStamp place={toPublic(place)} />;
}
