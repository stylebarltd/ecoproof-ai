import { appUrl } from "@/lib/nft";
import { COLLECTION_NAME, rankImage } from "@/lib/milestoneRules";

/** Metaplex-standard JSON for the collection itself (its on-chain uri, set by scripts/nft-setup.ts): what Explorer and wallets show for it. */
export function GET() {
  const image = `${appUrl()}${rankImage("paragon")}`;
  return Response.json({
    name: COLLECTION_NAME,
    symbol: "ECOPROOF",
    description: "Soulbound Bee Guardians from EcoProof AI. Earned by collecting eco stamps for real plastic-free purchases, never bought.",
    image,
    external_url: appUrl(),
    properties: { files: [{ uri: image, type: "image/png" }], category: "image" },
  }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
