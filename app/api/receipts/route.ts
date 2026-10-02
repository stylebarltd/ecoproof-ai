import { randomUUID } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { query } from "@/lib/db";
import { extractReceipt } from "@/lib/extract";
import { computeImpact } from "@/lib/impact";
import { rateLimited } from "@/lib/ratelimit";
import { hashRecord } from "@/lib/solana";
import { AlreadyClaimedError, claimOnChain, claimUrl, receiptFingerprint } from "@/lib/claim";

export const maxDuration = 60;
const TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip, 60)) return Response.json({ error: "Too many uploads, try again later" }, { status: 429 });
  if (Number(req.headers.get("content-length") || 0) > 8 * 1024 * 1024) return Response.json({ error: "Image too large (max 8MB)" }, { status: 413 });
  const form = await req.formData();
  const file = form.get("receipt");
  const userId = String(form.get("userId") || "demo-user");
  if (!(file instanceof File)) return Response.json({ error: "receipt file required" }, { status: 400 });
  const mediaType = TYPES.find((t) => t === file.type);
  if (!mediaType) return Response.json({ error: "unsupported image type" }, { status: 400 });

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const { merchant, items, receiptNumber, date, total } = await extractReceipt(base64, mediaType);
    if (!receiptNumber && !date && !(total > 0)) {
      return Response.json({ error: "Couldn't identify this receipt (no number, date or total). Try a clearer photo of the whole receipt." }, { status: 422 });
    }
    const fp = receiptFingerprint({ receiptNumber, date, total, merchant });
    const taken = (r: { claim_address: string | null } | undefined) =>
      Response.json({ error: "This receipt has already been claimed on Solana, so it can't be counted again.", claimAddress: r?.claim_address ?? null, claimUrl: r?.claim_address ? claimUrl(r.claim_address) : null }, { status: 409 });
    const prior = (await query<{ claim_address: string | null }>("SELECT claim_address FROM records WHERE receipt_fp=$1", [fp]))[0];
    if (prior) return taken(prior);

    const impact = computeImpact(items);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const hash = hashRecord({ id, userId, merchant, items, impact, createdAt });

    // One transaction: claim account (the chain refuses a second one) + the record hash as a memo.
    let signature: string | null = null;
    let claimAddress: string | null = null;
    try {
      ({ signature, claimAddress } = await claimOnChain("impact", fp, `ecoproof:v1:${hash}`));
    } catch (e) {
      if (e instanceof AlreadyClaimedError) return taken({ claim_address: e.claimAddress });
      console.error("claim failed", e); // chain unreachable: fall back to the database uniqueness rule
    }

    try {
      await query(
        `INSERT INTO records (id,user_id,merchant,items,co2_kg,plastic_items,packaging_g,sustainable_items,hash,signature,created_at,receipt_fp,claim_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [id, userId, merchant, JSON.stringify(items), impact.co2Kg, impact.plasticItems, impact.packagingG, impact.sustainableItems, hash, signature, createdAt, fp, claimAddress],
      );
    } catch (e) {
      if ((e as { code?: string }).code === "23505") return taken(undefined);
      throw e;
    }

    return Response.json({ id, merchant, items, impact, hash, signature, claimAddress, claimUrl: claimAddress ? claimUrl(claimAddress) : null });
  } catch (e) {
    console.error(e);
    if (e instanceof Anthropic.BadRequestError) return Response.json({ error: "We couldn't read that image. Try a clearer photo of the whole receipt." }, { status: 422 });
    if (e instanceof Anthropic.APIError) return Response.json({ error: "Receipt reading is busy right now. Please try again in a moment." }, { status: 503 });
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
