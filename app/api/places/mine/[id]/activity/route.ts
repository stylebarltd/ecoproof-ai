import { memberOf } from "@/lib/members";
import { answersFor, starsOf } from "@/lib/placePractices";
import { shopActivity } from "@/lib/shopActivity";
import { getPlace, toPublic } from "@/lib/stampPlaces";

/** The place (with its eco stars), the signed-in person's role, and its customer activity over the last ?days= (7, 30 or 90). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const m = await memberOf(req, id);
  if (m instanceof Response) return m;
  const place = await getPlace(id);
  if (!place) return Response.json({ error: "Not found" }, { status: 404 });
  const asked = Number(new URL(req.url).searchParams.get("days"));
  const days = [7, 30, 90].includes(asked) ? asked : 30;
  return Response.json(
    {
      place: {
        ...toPublic(place), status: place.status, statusNote: place.status === "active" ? null : place.status_note,
        stars: starsOf(place.kind, place.also_cafe, (await answersFor([id])).get(id) ?? {}),
      },
      role: m.role, activity: await shopActivity(id, days) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
