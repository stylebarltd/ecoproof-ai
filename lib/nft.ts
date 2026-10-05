import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { fetchMerkleTree } from "@metaplex-foundation/spl-account-compression";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createSignerFromKeypair, keypairIdentity, publicKey, publicKeyBytes, some, type Umi } from "@metaplex-foundation/umi";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import { mplBubblegum, mintV2, setNonTransferableV2, parseLeafFromMintV2Transaction } from "@metaplex-foundation/mpl-bubblegum";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { payerKeypair, RPC } from "./solana";

// Soulbound compressed NFTs (Metaplex Bubblegum V2).
//  - One Merkle tree and one MPL-Core collection (with BubblegumV2 + PermanentFreezeDelegate plugins) are created once by
//    scripts/nft-setup.ts; their addresses live in NFT_TREE_ADDRESS / NFT_COLLECTION_ADDRESS.
//  - Mint: mintV2 to the owner's wallet, then setNonTransferableV2 so the leaf can never be transferred (soulbound).
//    setNonTransferableV2 needs the leaf's Merkle proof. A public RPC has no indexer (DAS), so we read it straight from the
//    tree account: right after our own mint, the new leaf is the rightmost one and its proof is stored on-chain.
//    Mints are therefore serialised by the caller (see lib/milestones.ts).

export { BASE_MILESTONES, reachedMilestones, nextMilestone, tierFor, milestoneLabel, type Tier } from "./milestoneRules";

export const appUrl = () => (process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).replace(/\/$/, "");

export function umiClient(): Umi {
  const umi = createUmi(RPC).use(mplBubblegum()).use(mplCore());
  const kp = fromWeb3JsKeypair(payerKeypair());
  return umi.use(keypairIdentity(createSignerFromKeypair(umi, kp)));
}

export function nftConfig() {
  const tree = process.env.NFT_TREE_ADDRESS, collection = process.env.NFT_COLLECTION_ADDRESS;
  return tree && collection ? { tree, collection } : null;
}

export type MintInput = { owner: string; name: string; uri: string };
export type MintOutput = { assetId: string; mintSignature: string; freezeSignature: string };

export async function mintSoulbound({ owner, name, uri }: MintInput): Promise<MintOutput> {
  const cfg = nftConfig();
  if (!cfg) throw new Error("NFT_TREE_ADDRESS / NFT_COLLECTION_ADDRESS are not set (run scripts/nft-setup.ts)");
  const umi = umiClient();
  const merkleTree = publicKey(cfg.tree), coreCollection = publicKey(cfg.collection), leafOwner = publicKey(owner);

  const minted = await mintV2(umi, {
    leafOwner, merkleTree, coreCollection,
    metadata: { name, symbol: "ECOPROOF", uri, sellerFeeBasisPoints: 0, collection: some(coreCollection), creators: [] }, // symbol on chain too: Explorer shows that one, not the JSON metadata's
  }).sendAndConfirm(umi, { confirm: { commitment: "finalized" } });
  const mintSignature = base58.deserialize(minted.signature)[0];

  const leaf = await parseLeafFromMintV2Transaction(umi, minted.signature);
  if (leaf.__kind !== "V2") throw new Error("unexpected leaf version");

  // Proof + root of the just-minted (rightmost) leaf, read from the tree account.
  const { tree } = await fetchMerkleTree(umi, merkleTree, { commitment: "finalized" });
  const root = publicKeyBytes(tree.changeLogs[Number(tree.activeIndex)].root);
  const index = Number(leaf.nonce);
  const proof = tree.rightMostPath.proof;

  const frozen = await setNonTransferableV2(umi, {
    leafOwner, merkleTree, coreCollection, root,
    dataHash: leaf.dataHash, creatorHash: leaf.creatorHash, assetDataHash: some(leaf.assetDataHash), flags: some(leaf.flags),
    nonce: leaf.nonce, index, proof,
  }).sendAndConfirm(umi);
  return { assetId: leaf.id, mintSignature, freezeSignature: base58.deserialize(frozen.signature)[0] };
}

export async function ensureFunds(minSol = 0.5) {
  const conn = new Connection(RPC, "confirmed");
  const kp = payerKeypair();
  const bal = await conn.getBalance(kp.publicKey);
  if (bal < minSol * LAMPORTS_PER_SOL) {
    const sig = await conn.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
    await conn.confirmTransaction(sig, "confirmed");
  }
}
