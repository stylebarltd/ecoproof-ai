import { randomUUID } from "crypto";
import { query, type RecordRow } from "./db";
import { hashRecord } from "./solana";
import { hashInput } from "./verify";
import { AlreadyClaimedError, claimUrl, claimWithRetry } from "./claim";
import { computeImpact, type Impact } from "./impact";
import { matchItems, orderFingerprint, type Matched, type Order } from "./order";

export class DuplicateOrderError extends Error {
  constructor(public recordId: string | null, public claimAddress: string | null) { super("This order has already been proven."); }
}

export type ProofResult = {
  recordId: string; brandId: string; orderId: string; items: Matched[]; impact: Impact;
  hash: string; signature: string | null; claimAddress: string | null; claimUrl: string | null;
  cardUrl: string; proofUrl: string;
};

/**
 * Order -> impact record -> Solana proof. The order can be proven once (database unique index + on-chain claim account).
 * `passportId` is whose passport it lands on (wallet or anonymous id); it is not part of the order and not personal data.
 */
export async function proveOrder(order: Order, passportId: string, brandName: string): Promise<ProofResult> {
  const fp = orderFingerprint(order.brandId, order.orderId);
  const dup = await query<RecordRow>("SELECT * FROM records WHERE receipt_fp=$1", [fp]);
  if (dup.length) throw new DuplicateOrderError(dup[0].id, dup[0].claim_address ?? null);

  const items = await matchItems(order);
  const impact = computeImpact(items);
  const row: RecordRow = {
    id: randomUUID(), user_id: passportId, merchant: brandName,
    items: JSON.stringify(items.map(({ source: _s, ...li }) => li)),
    co2_kg: impact.co2Kg, plastic_items: impact.plasticItems, packaging_g: impact.packagingG, sustainable_items: impact.sustainableItems,
    hash: "", signature: null, created_at: new Date().toISOString(),
  };
  row.hash = hashRecord(hashInput(row)); // same hash input verifyRecord recomputes later

  let signature: string | null = null;
  let claimAddress: string | null = null;
  try {
    ({ signature, claimAddress } = await claimWithRetry("impact", fp, `ecoproof:v1:${row.hash}`));
  } catch (e) {
    if (e instanceof AlreadyClaimedError) throw new DuplicateOrderError(null, e.claimAddress);
    console.error("anchor failed; saving as pending", e); // the record is kept and /api/records/[id]/anchor can retry it
  }

  try {
    await query(
      `INSERT INTO records (id,user_id,merchant,items,co2_kg,plastic_items,packaging_g,sustainable_items,hash,signature,created_at,receipt_fp,claim_address,brand_id,order_id,source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'order')`,
      [row.id, row.user_id, row.merchant, row.items, row.co2_kg, row.plastic_items, row.packaging_g, row.sustainable_items, row.hash, signature, row.created_at, fp, claimAddress, order.brandId, order.orderId],
    );
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw new DuplicateOrderError(null, claimAddress);
    throw e;
  }
  return {
    recordId: row.id, brandId: order.brandId, orderId: order.orderId, items, impact, hash: row.hash, signature, claimAddress,
    claimUrl: claimAddress ? claimUrl(claimAddress) : null, cardUrl: `/api/card/${row.id}`, proofUrl: `/p/${row.id}`,
  };
}
