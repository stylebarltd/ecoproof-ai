import { query } from "@/lib/db";
import { appUrl, milestoneLabel, tierFor } from "@/lib/nft";

/** Metaplex-standard JSON for a milestone NFT. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = (await query<{ stats: string; milestone: number }>("SELECT stats, milestone FROM nft_mints WHERE id=$1", [id]))[0];
  if (!r) return Response.json({ error: "not found" }, { status: 404 });
  const tier = tierFor(r.milestone);
  const image = `${appUrl()}/api/nft/${id}/image`;
  return Response.json({
    name: `Eco ${tier.name} · ${milestoneLabel(r.milestone)}`,
    symbol: "ECOPROOF",
    description: `Soulbound EcoProof AI eco-warrior badge for reaching ${milestoneLabel(r.milestone)} in the EcoProof passport (verified purchases count for more than presence stamps). Every stamp is anchored on Solana.`,
    image,
    external_url: appUrl(),
    attributes: [
      { trait_type: "Tier", value: tier.name },
      { trait_type: "Points", value: r.milestone },
      { trait_type: "Soulbound", value: "true" },
    ],
    properties: { files: [{ uri: image, type: "image/svg+xml" }], category: "image" },
  });
}
