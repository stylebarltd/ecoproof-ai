import type { RecordRow } from "./db";
import { hashRecord, proofMemo, readMemo } from "./solana";
import { claimAddressOf, claimUrl, isClaimed } from "./claim";

/** The exact object that is hashed at creation time. Key order matters. */
export function hashInput(r: RecordRow) {
  return {
    id: r.id,
    userId: r.user_id,
    merchant: r.merchant,
    items: JSON.parse(r.items),
    impact: { co2Kg: r.co2_kg, plasticItems: r.plastic_items, packagingG: r.packaging_g, sustainableItems: r.sustainable_items },
    createdAt: new Date(r.created_at).toISOString(),
    // Stamp claims also commit to their place and door. Older records have no place_id, so their hash input is unchanged.
    ...(r.place_id ? { placeId: r.place_id, source: r.source ?? "qr" } : {}),
  };
}

export type Verification = {
  dataIntact: boolean; // recomputed hash matches the stored hash
  anchored: boolean; // a tx signature exists
  onChainMatch: boolean; // memo on Solana equals proofMemo(<hash>)
  recomputedHash: string;
  storedHash: string;
  claimed: boolean | null; // receipt claim account exists on Solana (null for older records without one)
  claimUrl?: string;
  slot?: number;
  blockTime?: string;
  error?: string;
};

export async function verifyRecord(r: RecordRow): Promise<Verification> {
  const recomputedHash = hashRecord(hashInput(r));
  const v: Verification = {
    dataIntact: recomputedHash === r.hash,
    anchored: !!r.signature,
    onChainMatch: false,
    recomputedHash,
    storedHash: r.hash,
    claimed: null,
  };
  if (r.receipt_fp) {
    try {
      v.claimed = await isClaimed("impact", r.receipt_fp);
      v.claimUrl = claimUrl(claimAddressOf("impact", r.receipt_fp));
    } catch { /* leave null if the RPC is unavailable */ }
  }
  if (!r.signature) return v;
  try {
    const chain = await readMemo(r.signature);
    if (!chain) { v.error = "Transaction not found on devnet"; return v; }
    v.slot = chain.slot;
    if (chain.blockTime) v.blockTime = new Date(chain.blockTime * 1000).toISOString();
    // Compare the on-chain memo to a hash recomputed from the data, not the stored hash.
    v.onChainMatch = chain.memo === proofMemo(recomputedHash);
  } catch (e) {
    v.error = e instanceof Error ? e.message : "RPC error";
  }
  return v;
}
