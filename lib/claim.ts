import { createHash } from "crypto";
import { Connection, Keypair, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";
import { CLUSTER, MEMO_PROGRAM, payerKeypair, RPC } from "./solana";

export type Purpose = "impact" | "review";

export class AlreadyClaimedError extends Error {
  constructor(public claimAddress: string) { super("This receipt has already been claimed on Solana."); }
}

const alnum = (s: string) => s.toLowerCase().replace(/[^a-z0-9฀-๿]/g, "");

/** Stable identity of one purchase. Uses printed number + date + total so re-reading the same receipt gives the same value. */
export function receiptFingerprint(r: { receiptNumber: string; date: string; total: number; merchant: string; scope?: string }): string {
  const num = alnum(r.receiptNumber || "");
  const parts = [num, r.date || "", (r.total || 0).toFixed(2), num ? "" : alnum(r.merchant || ""), r.scope ?? ""];
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

/** The fingerprint is public by design: anyone holding a receipt can recompute this address and check whether it was claimed. */
export function claimKeypair(purpose: Purpose, fp: string): Keypair {
  const seed = createHash("sha256").update(`ecoproof:claim:v1:${purpose}:${fp}`).digest();
  return Keypair.fromSeed(seed);
}
export const claimAddressOf = (purpose: Purpose, fp: string) => claimKeypair(purpose, fp).publicKey.toBase58();

/** A claim account is "taken" only if it is owned by the Memo program. A plain pre-funded account does not count. */
export async function isClaimed(purpose: Purpose, fp: string): Promise<boolean> {
  const info = await new Connection(RPC, "confirmed").getAccountInfo(claimKeypair(purpose, fp).publicKey);
  return !!info && info.owner.equals(MEMO_PROGRAM);
}

/**
 * One transaction: create the claim account (fails on-chain if it already exists) + write the record hash as a memo.
 * Throws AlreadyClaimedError if the receipt was claimed before.
 */
export async function claimOnChain(purpose: Purpose, fp: string, memo: string): Promise<{ signature: string; claimAddress: string }> {
  const conn = new Connection(RPC, "confirmed");
  const payer = payerKeypair();
  const claim = claimKeypair(purpose, fp);
  const claimAddress = claim.publicKey.toBase58();
  if (await isClaimed(purpose, fp)) throw new AlreadyClaimedError(claimAddress);

  const lamports = await conn.getMinimumBalanceForRentExemption(1);
  const tx = new Transaction().add(
    // Fails if the account already exists: this is the on-chain "only once" rule.
    SystemProgram.createAccount({ fromPubkey: payer.publicKey, newAccountPubkey: claim.publicKey, lamports, space: 1, programId: MEMO_PROGRAM }),
    new TransactionInstruction({ keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }], programId: MEMO_PROGRAM, data: Buffer.from(memo, "utf8") }),
  );
  try {
    const signature = await sendAndConfirmTransaction(conn, tx, [payer, claim]);
    return { signature, claimAddress };
  } catch (e) {
    if (/already in use|custom program error: 0x0\b/i.test(String(e instanceof Error ? e.message + (e as { logs?: string[] }).logs?.join(" ") : e))) {
      throw new AlreadyClaimedError(claimAddress);
    }
    throw e;
  }
}

/** Signature of the transaction that created a claim account (the oldest one touching it), or null. */
export async function findClaimSignature(purpose: Purpose, fp: string): Promise<string | null> {
  const sigs = await new Connection(RPC, "confirmed").getSignaturesForAddress(claimKeypair(purpose, fp).publicKey, { limit: 10 });
  return sigs.length ? sigs[sigs.length - 1].signature : null;
}

/** Retries transient Solana failures (timeouts, expired blockhash, RPC 429s). An already-claimed receipt is never retried. */
export async function claimWithRetry(purpose: Purpose, fp: string, memo: string, attempts = 3) {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await claimOnChain(purpose, fp, memo); }
    catch (e) {
      if (e instanceof AlreadyClaimedError) throw e;
      last = e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw last;
}

export const claimUrl = (addr: string) => `https://explorer.solana.com/address/${addr}?cluster=${CLUSTER}`;
