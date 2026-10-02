import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  return Response.json({ address: getSession(req)?.address ?? null }, { headers: { "Cache-Control": "no-store" } });
}
