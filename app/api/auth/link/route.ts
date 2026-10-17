import { query } from "@/lib/db";
import { mintPending } from "@/lib/milestones";
import { getSession, isDeviceId } from "@/lib/session";

/** Devices one account may merge in. Each linked device brings the stamps it collected, so this caps how far fresh ids can be farmed into one wallet. */
const MAX_DEVICES = 3;

/** After signing in, attach this device's anonymous passport to the account. Records are not rewritten (their hashes cover the old id). */
export async function POST(req: Request) {
  const s = await getSession(req);
  if (!s) return Response.json({ error: "Sign in first" }, { status: 401 });
  const { anonUserId } = (await req.json().catch(() => ({}))) as { anonUserId?: string };
  const anon = (anonUserId ?? "").trim();
  if (!isDeviceId(anon)) return Response.json({ error: "Invalid device id" }, { status: 400 });

  // user_links.wallet is the owner: a wallet, or "u_" + the account id for an account without one. Owned by any id of this account counts as theirs.
  const existing = (await query<{ wallet: string }>("SELECT wallet FROM user_links WHERE anon_id=$1", [anon]))[0];
  if (existing && !s.keys.includes(existing.wallet)) return Response.json({ error: "This device passport already belongs to another account." }, { status: 409 });
  if (!existing) {
    // Count and insert in one statement. Requests racing in parallel could still overshoot by one or two; the cap is a bound, not an exact quota.
    const added = await query(
      `INSERT INTO user_links (anon_id, wallet) SELECT $1, $2 WHERE (SELECT COUNT(*) FROM user_links WHERE wallet = ANY($4)) < $3 ON CONFLICT DO NOTHING RETURNING anon_id`,
      [anon, s.key, MAX_DEVICES, s.keys],
    );
    if (!added.length) {
      const owner = (await query<{ wallet: string }>("SELECT wallet FROM user_links WHERE anon_id=$1", [anon]))[0]?.wallet;
      if (!owner || !s.keys.includes(owner)) return Response.json({ error: owner ? "This device passport already belongs to another account." : `This account already has ${MAX_DEVICES} devices linked.` }, { status: 409 });
    }
  }

  const [r] = await query<{ n: number }>("SELECT COUNT(*)::int n FROM records WHERE user_id=$1", [anon]);
  await mintPending(s.key).catch((e) => console.error("mint after link failed", e)); // NFTs earned before a wallet existed
  return Response.json({ linked: true, receipts: r?.n ?? 0, alreadyLinked: !!existing });
}
