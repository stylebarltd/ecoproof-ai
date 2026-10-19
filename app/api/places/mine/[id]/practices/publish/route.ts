import { DeclarationError, publish } from "@/lib/declarations";
import { memberOf } from "@/lib/members";
import { answersFor, practiceSetup } from "@/lib/placePractices";
import { getPlace } from "@/lib/stampPlaces";

export const maxDuration = 60;

/** Publishes the saved checklist as a permanent declaration on Solana. Body: { confirm: true }, sent after the owner has read the warning. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const m = await memberOf(req, id, "owner");
  if (m instanceof Response) return m;
  const place = await getPlace(id);
  if (!place) return Response.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (body?.confirm !== true) return Response.json({ error: "Confirm that your answers are true before publishing." }, { status: 400 });
  try {
    await publish(place, (await answersFor([id])).get(id) ?? {}, m.s.userId ?? m.s.key);
  } catch (e) {
    if (e instanceof DeclarationError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
  return Response.json(await practiceSetup(place));
}
