import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { getPlace, toPublic } from "@/lib/stampPlaces";
import ReportForm from "@/components/ReportForm";

export const dynamic = "force-dynamic";

/** Report a place, or with ?product=<id> one product on its eco list. */
export default async function Report({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ product?: string }> }) {
  const place = await getPlace((await params).id);
  if (!place) notFound();
  const productId = (await searchParams).product;
  if (!productId) return <ReportForm place={toPublic(place)} />;
  const [product] = await query<{ id: string; name: string }>("SELECT id, display_name AS name FROM products WHERE id=$1 AND place_id=$2 AND status <> 'removed'", [productId, place.id]);
  if (!product) notFound();
  return <ReportForm place={toPublic(place)} product={product} />;
}
