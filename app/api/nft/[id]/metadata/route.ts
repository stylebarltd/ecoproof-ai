import { query } from "@/lib/db";
import { appUrl } from "@/lib/nft";
import { replacesText } from "@/lib/impact";
import { editionOf, nftName, rankImage, tierFor } from "@/lib/milestoneRules";
import { verifiedImpact, type NftStats } from "@/lib/milestones";

/**
 * Metaplex-standard JSON for a milestone NFT. The on-chain leaf points here, so changes to it reach NFTs already minted.
 * The impact attributes are the owner's running totals from verified purchases: they grow with every verified purchase.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = (await query<{ stats: string; milestone: number; owner_key: string; wallet: string | null }>("SELECT stats, milestone, owner_key, wallet FROM nft_mints WHERE id=$1", [id]))[0];
  if (!r) return Response.json({ error: "not found" }, { status: 404 });
  const rank = tierFor(r.milestone);
  const stats = JSON.parse(r.stats) as Partial<NftStats>;
  const image = `${appUrl()}${rankImage(rank.key)}`;
  const impact = await verifiedImpact(r.wallet ?? r.owner_key);
  const replaced = replacesText(impact.replaces, 3);
  const proven = (replaced ? ` With verified purchases, its guardian has replaced about ${replaced}.` : "")
    + (impact.co2Kg > 0 ? ` ${replaced ? "It has" : "With verified purchases, its guardian has"} saved ${impact.co2Kg.toFixed(1)} kg of CO₂.` : "");
  return Response.json({
    name: nftName(rank),
    symbol: "ECOPROOF",
    description: `A soulbound EcoProof AI Bee Guardian. Earned by proving real eco purchases. Protects the planet.${proven}`,
    image,
    external_url: appUrl(),
    attributes: [
      { trait_type: "Rank", value: rank.name },
      { trait_type: "Tier", value: rank.tier },
      { trait_type: "Points at mint", value: stats.proofs ?? r.milestone },
      { trait_type: "Milestone", value: r.milestone },
      ...(rank.key === "paragon" ? [{ trait_type: "Edition", value: editionOf(r.milestone) }] : []),
      { trait_type: "Verified purchases", value: impact.purchases },
      { trait_type: "Single-use items replaced", value: impact.plasticItems },
      ...(impact.replaces.length ? [{ trait_type: "Replaced", value: replacesText(impact.replaces, 4) }] : []),
      { trait_type: "CO₂ saved (kg)", value: impact.co2Kg },
      { trait_type: "Soulbound", value: true },
    ],
    properties: { files: [{ uri: image, type: "image/png" }], category: "image" },
  }, { headers: { "Cache-Control": "public, max-age=60" } }); // short: the impact totals change with each verified purchase
}
