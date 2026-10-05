// One-time: creates the Merkle tree + MPL-Core collection used for soulbound milestone NFTs and prints the env vars to set.
// Run: npx tsx scripts/nft-setup.ts
import { generateSigner } from "@metaplex-foundation/umi";
import { createTreeV2 } from "@metaplex-foundation/mpl-bubblegum";
import { createCollection } from "@metaplex-foundation/mpl-core";
import { ensureFunds, umiClient, appUrl } from "../lib/nft";

async function main() {
await ensureFunds(0.3).catch((e) => console.warn("airdrop failed, continuing with current balance:", e.message));
const umi = umiClient();

const collection = generateSigner(umi);
await createCollection(umi, {
  collection,
  name: "EcoProof Bee Guardians",
  uri: `${appUrl()}/api/nft/collection`,
  plugins: [
    { type: "BubblegumV2" },
    { type: "PermanentFreezeDelegate", frozen: false, authority: { type: "UpdateAuthority" } },
  ],
}).sendAndConfirm(umi);

const merkleTree = generateSigner(umi);
// depth 14 => 16,384 NFTs; buffer 64 allows concurrent writes.
await (await createTreeV2(umi, { merkleTree, maxDepth: 14, maxBufferSize: 64, public: false })).sendAndConfirm(umi);

console.log(`NFT_COLLECTION_ADDRESS=${collection.publicKey}\nNFT_TREE_ADDRESS=${merkleTree.publicKey}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
