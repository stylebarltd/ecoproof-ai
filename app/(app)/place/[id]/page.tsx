import { notFound } from "next/navigation";
import { getPlace, toPublic } from "@/lib/stampPlaces";

export const dynamic = "force-dynamic";

/** Print-ready counter card for a place: stamp, name and the claim QR. */
export default async function PlaceCard({ params }: { params: Promise<{ id: string }> }) {
  const place = await getPlace((await params).id);
  if (!place) notFound();
  const p = toPublic(place);
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 rounded-[32px] bg-white p-8 text-center shadow-sm ring-1 ring-sage-300">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.imageUrl} alt={`${p.name} stamp`} width={160} height={160} />
      <h1 className="text-2xl">{p.name}</h1>
      {p.tagline && <p className="text-sm text-neutral-600">{p.tagline}</p>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.qrUrl} alt="Scan to collect your stamp" width={240} height={240} />
      <p className="font-heading text-lg">Scan to collect your eco stamp</p>
      <p className="break-all text-[11px] text-neutral-500">{p.claimUrl}</p>
    </div>
  );
}
