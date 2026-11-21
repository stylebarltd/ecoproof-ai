import { query } from "@/lib/db";
import { rankImage, tierFor } from "@/lib/milestoneRules";
import { seasonCard, seasonImage } from "@/lib/seasonRules";

/** The NFT's artwork: a redirect to its rank's static PNG (all five ship in public/nft). Relative, so it never depends on the request's Host. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = (await query<{ milestone: number; design: string | null }>("SELECT milestone, design FROM nft_mints WHERE id=$1", [id]))[0];
  if (!r) return new Response("not found", { status: 404 });
  const card = r.design ? seasonCard(r.design) : undefined; // a Season card has its own picture (public/nft/season1)
  if (r.design && !card) return new Response("not found", { status: 404 });
  return new Response(null, { status: 307, headers: { Location: card ? seasonImage(card.key) : rankImage(tierFor(r.milestone).key) } });
}
