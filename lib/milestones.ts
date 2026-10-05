import { randomUUID } from "crypto";
import { query } from "./db";
import { identityGroup } from "./users";
import { looksLikeWallet } from "./session";
import { appUrl, mintSoulbound, nftConfig, reachedMilestones, tierFor } from "./nft";
import { editionOf, onChainName, rankWebp, type RankKey } from "./milestoneRules";

/** What a passport had when it reached a milestone. Stored with the mint and shown in the NFT metadata. */
export type NftStats = { milestone: number; /** the owner's points total when the milestone was reached */ proofs: number; plasticItems: number; co2Kg: number; brand: string };

type MintRow = { serial?: number; id: string; owner_key: string; milestone: number; status: string; stats: string; svg: string | null; wallet: string | null; asset_id: string | null; mint_signature: string | null; freeze_signature: string | null; error: string | null };

/** `serial` numbers each rank (and each Paragon edition) in the order it was earned: "Warden #0007". */
export type Nft = { id: string; milestone: number; tier: string; rank: RankKey; tierNumber: number; edition: number; serial: number; webpUrl: string; status: string; assetId: string | null; mintSignature: string | null; freezeSignature: string | null; imageUrl: string; metadataUrl: string; error: string | null };
const toNft = (r: MintRow): Nft => ({
  id: r.id, milestone: r.milestone, tier: tierFor(r.milestone).name, rank: tierFor(r.milestone).key, tierNumber: tierFor(r.milestone).tier,
  edition: editionOf(r.milestone), serial: Number(r.serial ?? 0), webpUrl: rankWebp(tierFor(r.milestone).key), status: r.status, assetId: r.asset_id,
  mintSignature: r.mint_signature, freezeSignature: r.freeze_signature,
  imageUrl: `${appUrl()}/api/nft/${r.id}/image`, metadataUrl: `${appUrl()}/api/nft/${r.id}/metadata`, error: r.error,
});

// Mints touch one Merkle tree and read the rightmost proof, so they run one at a time (per server instance).
let chain: Promise<unknown> = Promise.resolve();
const serial = <T>(fn: () => Promise<T>): Promise<T> => { const p = chain.then(fn, fn); chain = p.catch(() => {}); return p; };

/** Records a pending milestone NFT for every milestone the passport has reached. Idempotent (unique per owner + milestone). */
export async function recordMilestones(passportId: string, stats: Omit<NftStats, "milestone">): Promise<void> {
  const group = await identityGroup(passportId);
  const have = await query<{ milestone: number }>("SELECT milestone FROM nft_mints WHERE owner_key = ANY($1)", [group]);
  for (const m of reachedMilestones(stats.proofs)) {
    if (have.some((h) => h.milestone === m)) continue;
    await query(
      "INSERT INTO nft_mints (id, owner_key, milestone, stats) VALUES ($1,$2,$3,$4) ON CONFLICT (owner_key, milestone) DO NOTHING",
      [randomUUID(), passportId, m, JSON.stringify({ ...stats, milestone: m })],
    );
  }
}

/** Mints every pending NFT for this passport that has a wallet to receive it. Safe to call repeatedly; failures stay pending. */
export async function mintPending(passportId: string, onMint?: (milestone: number) => void): Promise<Nft[]> {
  const group = await identityGroup(passportId);
  const wallet = looksLikeWallet(group[0]) ? group[0] : null;
  if (!wallet || !nftConfig()) return listNfts(passportId);
  // Devices that earned a milestone before they were linked each hold a row for it; the wallet gets one NFT per milestone, the rest are merged.
  await query(
    `UPDATE nft_mints m SET status='merged' WHERE owner_key = ANY($1) AND status='pending'
       AND EXISTS (SELECT 1 FROM nft_mints o WHERE o.owner_key = ANY($1) AND o.milestone = m.milestone AND o.status <> 'merged'
                   AND (o.status IN ('minting','minted') OR (o.created_at, o.id) < (m.created_at, m.id)))`,
    [group],
  );
  const pending = await query<MintRow>("SELECT * FROM nft_mints WHERE owner_key = ANY($1) AND status='pending' ORDER BY milestone", [group]);
  for (const row of pending) {
    // claim the row so concurrent calls cannot double-mint
    const claimed = await query("UPDATE nft_mints SET status='minting', wallet=$2 WHERE id=$1 AND status='pending' RETURNING id", [row.id, wallet]);
    if (!claimed.length) continue;
    onMint?.(row.milestone);
    try {
      // The artwork is a static file per rank, referenced from the metadata JSON: nothing is generated here, so artwork can never fail a mint.
      const out = await serial(() => mintSoulbound({ owner: wallet, name: onChainName(tierFor(row.milestone)), uri: `${appUrl()}/api/nft/${row.id}/metadata` }));
      await query("UPDATE nft_mints SET status='minted', asset_id=$2, mint_signature=$3, freeze_signature=$4, error=NULL, minted_at=now() WHERE id=$1", [row.id, out.assetId, out.mintSignature, out.freezeSignature]);
    } catch (e) {
      console.error("nft mint failed", e);
      await query("UPDATE nft_mints SET status='pending', error=$2 WHERE id=$1", [row.id, e instanceof Error ? e.message.slice(0, 300) : "mint failed"]);
    }
  }
  return listNfts(passportId);
}

export async function listNfts(passportId: string): Promise<Nft[]> {
  const group = await identityGroup(passportId);
  return (await query<MintRow>(
    "SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY milestone ORDER BY created_at, id) AS serial FROM nft_mints WHERE status <> 'merged') m WHERE owner_key = ANY($1) ORDER BY milestone",
    [group],
  )).map(toNft);
}

/** After any valid proof: record the milestones the passport has now reached and mint those it can. A failed mint never fails the claim. */
export async function afterProof(passportId: string, totals: { points: number; plasticItems: number; co2Kg: number }, brand = "EcoProof", onMint?: (milestone: number) => void): Promise<Nft[]> {
  try {
    await recordMilestones(passportId, { proofs: totals.points, plasticItems: totals.plasticItems, co2Kg: totals.co2Kg, brand });
    return await mintPending(passportId, onMint);
  } catch (e) { console.error("milestone step failed", e); return []; }
}
