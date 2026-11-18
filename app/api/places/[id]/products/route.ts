import { publicImpacts } from "@/lib/products";
import { getPlace } from "@/lib/stampPlaces";

/** A shop's eco list with what each product counts (grams of plastic and CO2 per unit bought), so the shop's own site can show
 *  EcoProof's numbers. Public: it is what the shop's page here shows. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const place = await getPlace((await params).id);
  if (!place || place.status !== "active") return Response.json({ error: "Unknown place" }, { status: 404 });
  return Response.json({ place: { id: place.id, name: place.name }, products: await publicImpacts(place.id) }, { headers: { "Cache-Control": "public, max-age=300" } });
}
