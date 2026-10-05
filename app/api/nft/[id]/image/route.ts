import { query } from "@/lib/db";
import { rankImage, tierFor } from "@/lib/milestoneRules";

/** The NFT's artwork: a redirect to its rank's static PNG (all five ship in public/nft). Relative, so it never depends on the request's Host. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = (await query<{ milestone: number }>("SELECT milestone FROM nft_mints WHERE id=$1", [id]))[0];
  if (!r) return new Response("not found", { status: 404 });
  return new Response(null, { status: 307, headers: { Location: rankImage(tierFor(r.milestone).key) } });
}
