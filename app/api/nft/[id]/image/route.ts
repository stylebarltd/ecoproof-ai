import { query } from "@/lib/db";
import { fallbackSvg, generateArt, type NftStats } from "@/lib/nftArt";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = (await query<{ svg: string | null; stats: string }>("SELECT svg, stats FROM nft_mints WHERE id=$1", [id]))[0];
  if (!r) return new Response("not found", { status: 404 });
  let svg = r.svg;
  if (!svg) {
    svg = (await generateArt(JSON.parse(r.stats) as NftStats)).svg;
    await query("UPDATE nft_mints SET svg=$2 WHERE id=$1 AND svg IS NULL", [id, svg]);
  }
  return new Response(svg ?? fallbackSvg(JSON.parse(r.stats)), { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable" } });
}
