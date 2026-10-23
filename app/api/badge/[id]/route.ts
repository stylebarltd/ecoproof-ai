import { badgeSvg } from "@/lib/badge";
import { isShop } from "@/lib/placeKinds";
import { shopImpact } from "@/lib/shops";
import { getPlace } from "@/lib/stampPlaces";

/** A shop's live impact badge, /api/badge/<place>.svg (the .svg is optional): what its customers' verified purchases saved so far. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id.replace(/\.svg$/i, "");
  const place = await getPlace(id);
  if (!place || place.status !== "active" || !isShop(place.kind)) return new Response("not found", { status: 404 });
  const impact = (await shopImpact([place.id])).get(place.id)!;
  return new Response(badgeSvg(place.name, impact), {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600" },
  });
}
