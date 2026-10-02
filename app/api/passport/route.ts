import { getPassport } from "@/lib/passport";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const session = getSession(req);
  const userId = session ? session.address : sp.get("userId"); // signed-in wallet wins; anyone may read a public passport by id
  const tz = Math.max(-840, Math.min(840, Math.round(Number(sp.get("tz")) || 0)));
  if (!userId || userId.length > 64) return Response.json({ error: "userId required" }, { status: 400 });
  return Response.json(await getPassport(userId, tz));
}
