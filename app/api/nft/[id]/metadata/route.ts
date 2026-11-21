import { query } from "@/lib/db";
import { appUrl } from "@/lib/nft";
import { grams } from "@/lib/impact";
import { editionOf, nftName, rankImage, tierFor } from "@/lib/milestoneRules";
import { verifiedImpact, type NftStats } from "@/lib/milestones";
import { RANKS } from "@/lib/milestoneRules";
import { SEASON, seasonCard, seasonImage, seasonNftName } from "@/lib/seasonRules";

/**
 * Metaplex-standard JSON for a milestone NFT. The on-chain leaf points here, so changes to it reach NFTs already minted.
 * The impact attributes are the owner's running totals from verified purchases: they grow with every verified purchase.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = (await query<{ stats: string; milestone: number; owner_key: string; wallet: string | null; design: string | null; serial: number | null }>("SELECT stats, milestone, owner_key, wallet, design, serial FROM nft_mints WHERE id=$1", [id]))[0];
  if (!r) return Response.json({ error: "not found" }, { status: 404 });
  if (r.design) { // a Season card: its own name, picture and numbering; the impact totals grow like on a rank card
    const card = seasonCard(r.design);
    if (!card) return Response.json({ error: "not found" }, { status: 404 });
    const img = `${appUrl()}${seasonImage(card.key)}`;
    const imp = await verifiedImpact(r.wallet ?? r.owner_key);
    const rankName = RANKS.find((x) => x.key === card.rank)!.name;
    return Response.json({
      name: seasonNftName(card),
      symbol: "ECOPROOF",
      description: `A soulbound EcoProof Season ${SEASON} card from the ${rankName} set: ${card.kind === "lucky" ? "a lucky card, drawn at random" : card.kind === "explorer" ? "an Explorer card, earned by collecting stamps at many different places" : "an Impact card, earned with verified eco purchases"}. Only ${card.cap} exist.`,
      image: img,
      external_url: appUrl(),
      attributes: [
        { trait_type: "Season", value: SEASON },
        { trait_type: "Card", value: card.name },
        { trait_type: "Set", value: rankName },
        { trait_type: "Kind", value: card.kind === "lucky" ? "Lucky" : card.kind === "explorer" ? "Explorer" : "Impact" },
        ...(r.serial ? [{ trait_type: "Number", value: r.serial }] : []),
        { trait_type: "Supply", value: card.cap },
        { trait_type: "Verified purchases", value: imp.purchases },
        { trait_type: "Plastic avoided (g)", value: imp.plasticG },
        { trait_type: "CO₂ saved (g)", value: Math.round(imp.co2Kg * 1000) },
        { trait_type: "Soulbound", value: true },
      ],
      properties: { files: [{ uri: img, type: "image/png" }], category: "image" },
    }, { headers: { "Cache-Control": "public, max-age=60" } });
  }
  const rank = tierFor(r.milestone);
  const stats = JSON.parse(r.stats) as Partial<NftStats>;
  const image = `${appUrl()}${rankImage(rank.key)}`;
  const impact = await verifiedImpact(r.wallet ?? r.owner_key);
  const proven = impact.plasticG > 0 || impact.co2Kg > 0
    ? ` With verified purchases, its guardian has avoided ${grams(impact.plasticG)} of plastic and ${grams(impact.co2Kg * 1000)} of CO₂.` : "";
  return Response.json({
    name: nftName(rank),
    symbol: "ECOPROOF",
    description: `A soulbound EcoProof Bee Guardian. Earned by proving real eco purchases. Protects the planet.${proven}`,
    image,
    external_url: appUrl(),
    attributes: [
      { trait_type: "Rank", value: rank.name },
      { trait_type: "Tier", value: rank.tier },
      { trait_type: "Points at mint", value: stats.proofs ?? r.milestone },
      { trait_type: "Milestone", value: r.milestone },
      ...(rank.key === "paragon" ? [{ trait_type: "Edition", value: editionOf(r.milestone) }] : []),
      { trait_type: "Verified purchases", value: impact.purchases },
      { trait_type: "Plastic avoided (g)", value: impact.plasticG },
      { trait_type: "CO₂ saved (g)", value: Math.round(impact.co2Kg * 1000) },
      { trait_type: "Soulbound", value: true },
    ],
    properties: { files: [{ uri: image, type: "image/png" }], category: "image" },
  }, { headers: { "Cache-Control": "public, max-age=60" } }); // short: the impact totals change with each verified purchase
}
