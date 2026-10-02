import { randomUUID } from "crypto";
import { query } from "@/lib/db";
import { identityGroup } from "@/lib/users";
import { hashRecord } from "@/lib/solana";
import { AlreadyClaimedError, claimOnChain, claimUrl } from "@/lib/claim";

// Review gating, independent of where the proof comes from. It was written for receipt photos; the photo reading is gone,
// and a later step points this at the new order-based proof system by supplying a ProofRef from `resolveProof` below.
// Gate: a proof is recent, can back only one review (checked in the DB and by an on-chain claim account), and a person
// (including a linked wallet) reviews a place once (demo places excepted). The review hash is anchored on Solana.

export const MAX_AGE_DAYS = 14;

/** What the gate needs to know about a purchase proof, whatever its source. `fingerprint` must be stable per purchase. */
export type ProofRef = { fingerprint: string; date: string; label: string };

/** TODO(step 2+): resolve a proof (e.g. an EcoProof order proof id sent by the client) to a ProofRef. Returns null until wired. */
export async function resolveProof(_input: unknown): Promise<ProofRef | null> {
  return null;
}

export type ReviewInput = { placeId: string; placeDemo: boolean; userId: string; stars: number; confirmed: string[]; byoCup: boolean; proof: ProofRef };
export type GateResult = { status: number; body: Record<string, unknown> };

export async function submitGatedReview(i: ReviewInput): Promise<GateResult> {
  const { proof: p } = i;
  const ageDays = (Date.now() - Date.parse(p.date)) / 86_400_000;
  if (Number.isNaN(ageDays) || ageDays > MAX_AGE_DAYS || ageDays < -1) {
    return { status: 422, body: { error: `Proof date (${p.date}) must be within the last ${MAX_AGE_DAYS} days.` } };
  }

  const fp = p.fingerprint;
  const taken = (addr: string | null): GateResult => ({
    status: 409,
    body: { error: "This proof has already been claimed on Solana, so it can't be used for another review.", claimAddress: addr, claimUrl: addr ? claimUrl(addr) : null },
  });
  const dup = await query<{ claim_address: string | null }>("SELECT claim_address FROM reviews WHERE receipt_fp=$1", [fp]);
  if (dup.length) return taken(dup[0].claim_address);
  const group = await identityGroup(i.userId); // a person who linked a wallet cannot review the same place twice
  const existing = await query<{ id: string }>("SELECT id FROM reviews WHERE place_id=$1 AND user_id = ANY($2)", [i.placeId, group]);
  if (existing.length && !i.placeDemo) return { status: 409, body: { error: "You've already reviewed this place." } };

  const reviewId = randomUUID();
  const createdAt = new Date().toISOString();
  const hash = hashRecord({ id: reviewId, placeId: i.placeId, userId: i.userId, stars: i.stars, confirmed: i.confirmed, byoCup: i.byoCup, receiptFp: fp, createdAt });
  let signature: string | null = null;
  let claimAddress: string | null = null;
  try {
    ({ signature, claimAddress } = await claimOnChain("review", fp, `ecoproof:review:v1:${hash}`));
  } catch (e) {
    if (e instanceof AlreadyClaimedError) return taken(e.claimAddress);
    console.error("claim failed", e);
  }

  if (existing.length) await query("DELETE FROM reviews WHERE place_id=$1 AND user_id = ANY($2)", [i.placeId, group]);
  try {
    await query(
      `INSERT INTO reviews (id,place_id,user_id,stars,confirmed,byo_cup,receipt_fp,receipt_date,hash,signature,created_at,claim_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [reviewId, i.placeId, i.userId, i.stars, JSON.stringify(i.confirmed), i.byoCup, fp, p.date, hash, signature, createdAt, claimAddress],
    );
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return taken(null);
    throw e;
  }
  return { status: 200, body: { id: reviewId, hash, signature, claimAddress, claimUrl: claimAddress ? claimUrl(claimAddress) : null, byoCup: i.byoCup, confirmed: i.confirmed, proof: { label: p.label, date: p.date } } };
}
