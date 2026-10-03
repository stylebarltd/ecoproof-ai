import { notFound } from "next/navigation";
import { getPlace, toPublic } from "@/lib/stampPlaces";
import ReportForm from "@/components/ReportForm";

export const dynamic = "force-dynamic";

export default async function Report({ params }: { params: Promise<{ id: string }> }) {
  const place = await getPlace((await params).id);
  if (!place) notFound();
  return <ReportForm place={toPublic(place)} />;
}
