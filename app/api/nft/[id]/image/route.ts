import { query } from "@/lib/db";
import { rankImage, tierFor } from "@/lib/milestoneRules";
import { rankPlaceholderSvg } from "@/lib/rankArt";

const present = new Set<string>(); // ranks whose file was found, so the check runs once per server instance

/** The NFT's artwork: a redirect to its rank's static PNG, or a plain placeholder card if that file is missing. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = (await query<{ milestone: number }>("SELECT milestone FROM nft_mints WHERE id=$1", [id]))[0];
  if (!r) return new Response("not found", { status: 404 });
  const rank = tierFor(r.milestone);
  const png = new URL(rankImage(rank.key), req.url);
  const ok = present.has(rank.key) || (await fetch(png, { method: "HEAD" }).then((x) => x.ok, () => false));
  if (ok) { present.add(rank.key); return Response.redirect(png, 307); }
  return new Response(rankPlaceholderSvg(rank), { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60" } });
}
