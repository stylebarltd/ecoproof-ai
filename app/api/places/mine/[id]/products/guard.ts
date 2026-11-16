import { query } from "@/lib/db";
import { memberOf, type Role } from "@/lib/members";
import { isShop } from "@/lib/placeKinds";
import { ProductError, productSetup } from "@/lib/products";

/** The signed-in member of an eco shop, or the response that says why not. Products are an eco shop's: other places earn stars. */
export async function shopMember(req: Request, id: string, need: Role = "staff") {
  const m = await memberOf(req, id, need);
  if (m instanceof Response) return m;
  const [place] = await query<{ kind: string }>("SELECT kind FROM stamp_places WHERE id=$1", [id]);
  if (!place || !isShop(place.kind)) return Response.json({ error: "Only eco shops list products." }, { status: 400 });
  return m;
}

/** Runs a change and answers with the whole setup, so the page always shows what is saved. */
export async function answer(id: string, role: Role, change?: () => Promise<void>) {
  try { await change?.(); }
  catch (e) { if (e instanceof ProductError) return Response.json({ error: e.message }, { status: e.status }); throw e; }
  return Response.json(await productSetup(id, role), { headers: { "Cache-Control": "no-store" } });
}

/** A photo upload's body: the JPEG the browser shrank (lib/clientPhoto.ts). */
export const photoBody = async (req: Request) => Buffer.from(await req.arrayBuffer());
