import { DeclarationError, publish, toDeclaration } from "@/lib/declarations";
import { memberOf } from "@/lib/members";
import { answersFor, practiceSetup } from "@/lib/placePractices";
import { progressResponse, wantsProgress } from "@/lib/progress";
import { getPlace } from "@/lib/stampPlaces";

export const maxDuration = 60;

/**
 * Publishes the saved checklist as a permanent declaration on Solana. Body: { confirm: true }, sent after the owner has read the warning.
 * Send `Accept: application/x-ndjson` for live progress ({step}: check, seal, anchor; then {done} or {error}), as claims do.
 * Result: { declaration, setup } (setup = what GET on the checklist returns, without place and role).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const m = await memberOf(req, id, "owner");
  if (m instanceof Response) return m;
  const place = await getPlace(id);
  if (!place) return Response.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (body?.confirm !== true) return Response.json({ error: "Confirm that your answers are true before publishing." }, { status: 400 });

  const run = async (emit: (e: { step: string }) => void) => {
    const d = await publish(place, (await answersFor([id])).get(id) ?? {}, m.s.userId ?? m.s.key, (step) => emit({ step }));
    return { declaration: toDeclaration(d), setup: await practiceSetup(place) };
  };
  const fail = (e: unknown) => {
    if (e instanceof DeclarationError) return { status: e.status, body: { error: e.message } };
    console.error(e);
    return { status: 500, body: { error: "Something went wrong. Please try again." } };
  };

  if (wantsProgress(req)) return progressResponse(run, fail);
  try { return Response.json(await run(() => {})); }
  catch (e) { const f = fail(e); return Response.json(f.body, { status: f.status }); }
}
