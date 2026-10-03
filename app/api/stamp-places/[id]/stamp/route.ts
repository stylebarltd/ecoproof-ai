import { getPlace, stampSvg } from "@/lib/stampPlaces";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const p = await getPlace((await params).id);
  if (!p) return new Response("not found", { status: 404 });
  return new Response(stampSvg(p), { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300" } });
}
