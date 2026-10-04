import { randomUUID } from "crypto";
import { query } from "./db";
import { identityGroup } from "./users";
import { looksLikeWallet } from "./session";
import { appUrl, mintSoulbound, nftConfig, reachedMilestones, tierFor } from "./nft";
import { artSvg, type NftStats } from "./nftArt";

type MintRow = { id: string; owner_key: string; milestone: number; status: string; stats: string; svg: string | null; wallet: string | null; asset_id: string | null; mint_signature: string | null; freeze_signature: string | null; error: string | null };

export type Nft = { id: string; milestone: number; tier: string; status: string; assetId: string | null; mintSignature: string | null; freezeSignature: string | null; imageUrl: string; metadataUrl: string; error: string | null };
const toNft = (r: MintRow): Nft => ({
  id: r.id, milestone: r.milestone, tier: tierFor(r.milestone).name, status: r.status, assetId: r.asset_id,
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
  const pending = await query<MintRow>("SELECT * FROM nft_mints WHERE owner_key = ANY($1) AND status='pending' ORDER BY milestone", [group]);
  for (const row of pending) {
    // claim the row so concurrent calls cannot double-mint
    const claimed = await query("UPDATE nft_mints SET status='minting', wallet=$2 WHERE id=$1 AND status='pending' RETURNING id", [row.id, wallet]);
    if (!claimed.length) continue;
    onMint?.(row.milestone);
    try {
      const stats = JSON.parse(row.stats) as NftStats;
      await query("UPDATE nft_mints SET svg=$2 WHERE id=$1", [row.id, artSvg({ ...stats, seed: wallet })]);
      const out = await serial(() => mintSoulbound({ owner: wallet, name: `Eco ${tierFor(row.milestone).name} · ${row.milestone === 1 ? "1 stamp" : `${row.milestone} stamps`}`.slice(0, 32), uri: `${appUrl()}/api/nft/${row.id}/metadata` }));
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
  return (await query<MintRow>("SELECT * FROM nft_mints WHERE owner_key = ANY($1) ORDER BY milestone", [group])).map(toNft);
}

/** After any valid proof: record the milestones the passport has now reached and mint those it can. A failed mint never fails the claim. */
export async function afterProof(passportId: string, totals: { points: number; plasticItems: number; co2Kg: number }, brand = "EcoProof", onMint?: (milestone: number) => void): Promise<Nft[]> {
  try {
    await recordMilestones(passportId, { proofs: totals.points, plasticItems: totals.plasticItems, co2Kg: totals.co2Kg, brand });
    return await mintPending(passportId, onMint);
  } catch (e) { console.error("milestone step failed", e); return []; }
}
