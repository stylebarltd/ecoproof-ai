import { query, type RecordRow } from "@/lib/db";
import { AlreadyClaimedError, claimUrl, claimWithRetry, findClaimSignature } from "@/lib/claim";
import { proofMemo } from "@/lib/solana";
import { rateLimited } from "@/lib/ratelimit";

export const maxDuration = 60;

/** Anchors a saved record that is still pending (Solana was slow or down when it was created). Safe to call repeatedly. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip, 40)) return Response.json({ error: "Too many requests" }, { status: 429 });
  const { id } = await params;
  const rec = (await query<RecordRow>("SELECT * FROM records WHERE id=$1", [id]))[0];
  if (!rec) return Response.json({ error: "not found" }, { status: 404 });
  if (rec.signature && rec.claim_address) return Response.json({ signature: rec.signature, claimAddress: rec.claim_address, claimUrl: claimUrl(rec.claim_address), already: true });
  if (!rec.receipt_fp) return Response.json({ error: "This older record can't be anchored automatically." }, { status: 409 });

  try {
    const r = await claimWithRetry("impact", rec.receipt_fp, proofMemo(rec.hash));
    await query("UPDATE records SET signature=$1, claim_address=$2 WHERE id=$3", [r.signature, r.claimAddress, id]);
    return Response.json({ signature: r.signature, claimAddress: r.claimAddress, claimUrl: claimUrl(r.claimAddress) });
  } catch (e) {
    if (e instanceof AlreadyClaimedError) {
      // The claim transaction landed earlier but the database update did not: recover its signature from the chain.
      const sig = await findClaimSignature("impact", rec.receipt_fp).catch(() => null);
      if (sig) {
        await query("UPDATE records SET signature=$1, claim_address=$2 WHERE id=$3", [sig, e.claimAddress, id]);
        return Response.json({ signature: sig, claimAddress: e.claimAddress, claimUrl: claimUrl(e.claimAddress), recovered: true });
      }
    }
    console.error("anchor retry failed", e);
    return Response.json({ error: "Solana is slow right now. Please try again in a moment." }, { status: 503 });
  }
}
