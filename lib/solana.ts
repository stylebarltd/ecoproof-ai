import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";

export const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
export const CLUSTER = "devnet";
export const RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

export function hashRecord(record: unknown): string {
  return createHash("sha256").update(JSON.stringify(record)).digest("hex");
}

export function payerKeypair(): Keypair {
  if (process.env.SOLANA_SECRET_KEY) return Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_SECRET_KEY));
  const file = path.join(process.cwd(), ".payer.json");
  if (process.env.VERCEL) throw new Error("SOLANA_SECRET_KEY is not set");
  if (fs.existsSync(file)) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8"))));
  const kp = Keypair.generate();
  fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)));
  return kp;
}

/** The memo written with every proof: readable on Solana Explorer, and what verification compares against. */
export const proofMemo = (hash: string) => `EcoProof AI proof v1: ${hash}`;

/** Every memo a valid proof of this hash can carry: the current one, and `ecoproof:v1:<hash>` written by proofs made before it. */
export const proofMemos = (hash: string) => [proofMemo(hash), `ecoproof:v1:${hash}`];

export const explorerUrl = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`;

/** Reads a confirmed tx from devnet and returns its memo text, slot and block time. */
export async function readMemo(signature: string): Promise<{ memo: string | null; slot: number; blockTime: number | null } | null> {
  const conn = new Connection(RPC, "confirmed");
  const tx = await conn.getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  if (!tx || tx.meta?.err) return null;
  const ix = tx.transaction.message.instructions.find((i) => i.programId.equals(MEMO_PROGRAM));
  const memo = ix && "parsed" in ix && typeof ix.parsed === "string" ? ix.parsed : null;
  return { memo, slot: tx.slot, blockTime: tx.blockTime ?? null };
}

/** Public address of the wallet that signs proofs; its Explorer page lists every EcoProof memo. */
export function payerAddress(): string | null {
  try { return payerKeypair().publicKey.toBase58(); } catch { return null; }
}
export const addressUrl = (a: string) => `https://explorer.solana.com/address/${a}?cluster=${CLUSTER}`;
