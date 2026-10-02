import { query } from "@/lib/db";
import { PRACTICE_IDS } from "@/lib/places";
import { rateLimited } from "@/lib/ratelimit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip, 30)) return Response.json({ error: "Too many requests" }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { practices?: string[]; discount?: string } | null;
  const practices = (body?.practices ?? []).filter((p) => (PRACTICE_IDS as string[]).includes(p));
  if (!practices.length) return Response.json({ error: "Pick at least one practice" }, { status: 400 });
  if (!(await query("SELECT 1 FROM places WHERE id=$1", [id])).length) return Response.json({ error: "Unknown place" }, { status: 404 });
  const discount = (body?.discount ?? "").slice(0, 80);
  for (const p of practices) {
    await query(
      "INSERT INTO pledges (place_id, practice, detail) VALUES ($1,$2,$3) ON CONFLICT (place_id, practice) DO UPDATE SET detail = COALESCE(EXCLUDED.detail, pledges.detail)",
      [id, p, p === "byo_discount" && discount ? discount : null],
    );
  }
  return Response.json({ ok: true });
}
