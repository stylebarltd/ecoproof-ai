import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";

const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
export const CLUSTER = "devnet";
const RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

export function hashRecord(record: unknown): string {
  return createHash("sha256").update(JSON.stringify(record)).digest("hex");
}

function payer(): Keypair {
  if (process.env.SOLANA_SECRET_KEY) return Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_SECRET_KEY));
  const file = path.join(process.cwd(), ".payer.json");
  if (fs.existsSync(file)) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8"))));
  const kp = Keypair.generate();
  fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)));
  return kp;
}

/** Anchors `ecoproof:v1:<sha256>` on Solana devnet via the Memo program. Returns the tx signature. */
export async function anchorHash(hash: string): Promise<string> {
  const conn = new Connection(RPC, "confirmed");
  const kp = payer();
  if ((await conn.getBalance(kp.publicKey)) < 0.01 * LAMPORTS_PER_SOL) {
    const sig = await conn.requestAirdrop(kp.publicKey, LAMPORTS_PER_SOL);
    await conn.confirmTransaction(sig, "confirmed");
  }
  const ix = new TransactionInstruction({
    keys: [{ pubkey: kp.publicKey, isSigner: true, isWritable: true }],
    programId: MEMO_PROGRAM,
    data: Buffer.from(`ecoproof:v1:${hash}`, "utf8"),
  });
  return sendAndConfirmTransaction(conn, new Transaction().add(ix), [kp]);
}

export const explorerUrl = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`;
