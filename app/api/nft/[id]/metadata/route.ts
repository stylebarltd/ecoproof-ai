import { query } from "@/lib/db";
import { appUrl } from "@/lib/nft";
import { editionOf, nftName, rankImage, tierFor } from "@/lib/milestoneRules";
import type { NftStats } from "@/lib/milestones";

/** Metaplex-standard JSON for a milestone NFT. The on-chain leaf points here, so changes to it reach NFTs already minted. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = (await query<{ stats: string; milestone: number }>("SELECT stats, milestone FROM nft_mints WHERE id=$1", [id]))[0];
  if (!r) return Response.json({ error: "not found" }, { status: 404 });
  const rank = tierFor(r.milestone);
  const stats = JSON.parse(r.stats) as Partial<NftStats>;
  const image = `${appUrl()}${rankImage(rank.key)}`;
  return Response.json({
    name: nftName(rank),
    symbol: "ECOPROOF",
    description: "A soulbound EcoProof Bee Guardian. Earned by proving real eco purchases. Protects the planet.",
    image,
    external_url: appUrl(),
    attributes: [
      { trait_type: "Rank", value: rank.name },
      { trait_type: "Tier", value: rank.tier },
      { trait_type: "Points at mint", value: stats.proofs ?? r.milestone },
      { trait_type: "Milestone", value: r.milestone },
      ...(rank.key === "paragon" ? [{ trait_type: "Edition", value: editionOf(r.milestone) }] : []),
      { trait_type: "Soulbound", value: true },
    ],
    properties: { files: [{ uri: image, type: "image/png" }], category: "image" },
  }, { headers: { "Cache-Control": "public, max-age=300" } });
}
