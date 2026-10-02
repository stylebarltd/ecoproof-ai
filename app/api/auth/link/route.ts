import { query } from "@/lib/db";
import { mintPending } from "@/lib/milestones";
import { getSession, looksLikeWallet } from "@/lib/session";

/** After signing in, attach this device's anonymous passport to the wallet. Records are not rewritten (their hashes cover the old id). */
export async function POST(req: Request) {
  const s = getSession(req);
  if (!s) return Response.json({ error: "Sign in first" }, { status: 401 });
  const { anonUserId } = (await req.json().catch(() => ({}))) as { anonUserId?: string };
  const anon = (anonUserId ?? "").trim();
  if (!anon || anon.length > 64 || looksLikeWallet(anon)) return Response.json({ error: "Invalid device id" }, { status: 400 });

  const existing = (await query<{ wallet: string }>("SELECT wallet FROM user_links WHERE anon_id=$1", [anon]))[0];
  if (existing && existing.wallet !== s.address) return Response.json({ error: "This device passport already belongs to another wallet." }, { status: 409 });
  if (!existing) await query("INSERT INTO user_links (anon_id, wallet) VALUES ($1,$2) ON CONFLICT DO NOTHING", [anon, s.address]);

  const [r] = await query<{ n: number }>("SELECT COUNT(*)::int n FROM records WHERE user_id=$1", [anon]);
  const [v] = await query<{ n: number }>("SELECT COUNT(*)::int n FROM reviews WHERE user_id=$1", [anon]);
  await mintPending(s.address).catch((e) => console.error("mint after link failed", e)); // NFTs earned before a wallet existed
  return Response.json({ linked: true, receipts: r?.n ?? 0, reviews: v?.n ?? 0, alreadyLinked: !!existing });
}
