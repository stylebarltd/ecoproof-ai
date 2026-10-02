import Anthropic from "@anthropic-ai/sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { query } from "@/lib/db";
import { RPC, payerAddress } from "@/lib/solana";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const timed = async <T,>(fn: () => Promise<T>) => {
  const t = Date.now();
  try { const value = await fn(); return { ok: true as const, ms: Date.now() - t, value }; }
  catch (e) { return { ok: false as const, ms: Date.now() - t, error: e instanceof Error ? e.message.slice(0, 120) : "error" }; }
};

/** Pre-flight check before presenting: database, AI service, Solana RPC and wallet balance. Reveals no secrets. */
export async function GET() {
  const wallet = payerAddress();
  const [db, ai, chain] = await Promise.all([
    timed(() => query("SELECT 1")),
    timed(async () => { if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing"); await new Anthropic({ maxRetries: 1, timeout: 10_000 }).models.list({ limit: 1 }); }),
    timed(async () => (wallet ? (await new Connection(RPC, "confirmed").getBalance(new PublicKey(wallet))) / 1e9 : 0)),
  ]);
  const sol = chain.ok ? chain.value : null;
  const warnings: string[] = [];
  if (sol !== null && sol < 0.05) warnings.push(`Wallet is low on devnet SOL (${sol.toFixed(3)}). Each proof costs about 0.001.`);
  if (!wallet) warnings.push("No Solana wallet configured.");
  const ok = db.ok && ai.ok && chain.ok && (sol ?? 0) >= 0.01;
  return Response.json({
    ok, warnings,
    database: { ok: db.ok, ms: db.ms },
    ai: { ok: ai.ok, ms: ai.ms, ...(ai.ok ? {} : { error: ai.error }) },
    solana: { ok: chain.ok, ms: chain.ms, wallet, sol, estimatedProofsLeft: sol !== null ? Math.floor(sol / 0.00096) : null },
  }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
