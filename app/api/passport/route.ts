import { getPassport } from "@/lib/passport";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const userId = sp.get("userId");
  const tz = Math.max(-840, Math.min(840, Math.round(Number(sp.get("tz")) || 0)));
  if (!userId || userId.length > 64) return Response.json({ error: "userId required" }, { status: 400 });
  return Response.json(await getPassport(userId, tz));
}
