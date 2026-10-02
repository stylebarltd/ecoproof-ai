import { query } from "@/lib/db";
import { appUrl, TIERS } from "@/lib/nft";
import type { NftStats } from "@/lib/nftArt";

/** Metaplex-standard JSON for a milestone NFT. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = (await query<{ stats: string; milestone: number }>("SELECT stats, milestone FROM nft_mints WHERE id=$1", [id]))[0];
  if (!r) return Response.json({ error: "not found" }, { status: 404 });
  const st = JSON.parse(r.stats) as NftStats;
  const tier = TIERS[r.milestone];
  const image = `${appUrl()}/api/nft/${id}/image`;
  return Response.json({
    name: `Eco ${tier?.name} · ${st.brand}`,
    symbol: "ECOPROOF",
    description: `Soulbound EcoProof AI eco-warrior badge for reaching ${r.milestone} verified purchase proof${r.milestone > 1 ? "s" : ""} with ${st.brand}. Every proof is anchored on Solana.`,
    image,
    external_url: appUrl(),
    attributes: [
      { trait_type: "Tier", value: tier?.name },
      { trait_type: "Milestone", value: r.milestone },
      { trait_type: "Single-use plastic avoided", value: st.plasticItems },
      { trait_type: "CO2 saved (kg)", value: st.co2Kg },
      { trait_type: "Brand", value: st.brand },
      { trait_type: "Soulbound", value: "true" },
    ],
    properties: { files: [{ uri: image, type: "image/svg+xml" }], category: "image" },
  });
}
