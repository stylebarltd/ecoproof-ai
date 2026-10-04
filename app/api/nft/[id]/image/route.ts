import { query } from "@/lib/db";
import { artSvg, type NftStats } from "@/lib/nftArt";

// The artwork is a pure function of the milestone and the owner's wallet, so it is regenerated on demand; nothing external is involved.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = (await query<{ stats: string; milestone: number; wallet: string | null; owner_key: string }>("SELECT stats, milestone, wallet, owner_key FROM nft_mints WHERE id=$1", [id]))[0];
  if (!r) return new Response("not found", { status: 404 });
  const svg = artSvg({ ...(JSON.parse(r.stats) as NftStats), milestone: r.milestone, seed: r.wallet ?? r.owner_key }) // the owner's wallet picks the character;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable" } });
}
