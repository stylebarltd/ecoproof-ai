import { getPassport } from "@/lib/passport";

export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId || userId.length > 64) return Response.json({ error: "userId required" }, { status: 400 });
  return Response.json(await getPassport(userId));
}
