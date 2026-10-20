import { memberOf } from "@/lib/members";
import { PracticeError, practiceSetup, savePractices } from "@/lib/placePractices";
import { getPlace, toPublic } from "@/lib/stampPlaces";

/** The place's type, address and practice answers, with its stars. Staff can look; only the owner can change them (PUT). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const m = await memberOf(req, id);
  if (m instanceof Response) return m;
  const place = await getPlace(id);
  if (!place) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ place: toPublic(place), role: m.role, ...(await practiceSetup(place)) }, { headers: { "Cache-Control": "no-store" } });
}

/** Body: { kind, alsoCafe?, address?, online?, location?: { lat, lng }, answers: { [practiceId]: "yes" | "no" | "not_applicable" } }.
 *  online and location are an eco shop's channels; a location can be added, not removed. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const m = await memberOf(req, id, "owner");
  if (m instanceof Response) return m;
  const place = await getPlace(id);
  if (!place) return Response.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Send JSON" }, { status: 400 });
  try {
    await savePractices(place, body);
  } catch (e) {
    if (e instanceof PracticeError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
  const saved = (await getPlace(id))!;
  return Response.json({ place: toPublic(saved), ...(await practiceSetup(saved)) });
}
