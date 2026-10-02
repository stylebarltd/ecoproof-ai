import { randomUUID } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { query } from "@/lib/db";
import { extractReceipt, type Extraction } from "@/lib/extract";
import { computeImpact } from "@/lib/impact";
import { rateLimited } from "@/lib/ratelimit";
import { hashRecord } from "@/lib/solana";
import { AlreadyClaimedError, claimUrl, claimWithRetry, receiptFingerprint } from "@/lib/claim";
import { DEMO_MENUS, demoItems, type DemoKind } from "@/lib/demoMenus";

export const maxDuration = 60;
const TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;

type Emit = (e: Record<string, unknown>) => void;
type Outcome = { status: number; body: Record<string, unknown> };

const fail = (status: number, error: string, extra: Record<string, unknown> = {}): Outcome => ({ status, body: { error, ...extra } });

/** Demo receipts carry their own metadata so the demo can still complete if the AI service is unavailable. */
function demoFallback(form: FormData): Extraction | null {
  try {
    const m = JSON.parse(String(form.get("demoMeta") || ""));
    if (!(m.kind in DEMO_MENUS) || typeof m.receiptNumber !== "string" || m.receiptNumber.length > 40 || !/^\d{4}-\d{2}-\d{2}$/.test(m.date) || !(m.total > 0)) return null;
    return { merchant: String(m.merchant).slice(0, 60), receiptNumber: m.receiptNumber, date: m.date, total: Number(m.total), items: demoItems(m.kind as DemoKind) };
  } catch { return null; }
}

async function run(form: FormData, file: File, mediaType: (typeof TYPES)[number], userId: string, emit: Emit): Promise<Outcome> {
  const taken = (addr: string | null | undefined): Outcome =>
    fail(409, "This receipt has already been claimed on Solana, so it can't be counted again.", { claimAddress: addr ?? null, claimUrl: addr ? claimUrl(addr) : null });

  try {
    // 1. Scan: the AI reads the receipt.
    emit({ t: "extracting" });
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    let ex: Extraction;
    let sample = false;
    try {
      ex = await extractReceipt(base64, mediaType);
    } catch (e) {
      const fb = e instanceof Anthropic.APIError && !(e instanceof Anthropic.BadRequestError) ? demoFallback(form) : null;
      if (!fb) throw e;
      console.error("AI unavailable, using sample extraction for demo receipt", e);
      ex = fb; sample = true;
    }
    const { merchant, items, receiptNumber, date, total } = ex;
    if (!receiptNumber && !date && !(total > 0)) {
      return fail(422, "Couldn't identify this receipt (no number, date or total). Try a clearer photo of the whole receipt.");
    }
    emit({ t: "extracted", merchant, receiptNumber, date, total, items, sample });

    const fp = receiptFingerprint({ receiptNumber, date, total, merchant });
    const prior = (await query<{ claim_address: string | null }>("SELECT claim_address FROM records WHERE receipt_fp=$1", [fp]))[0];
    if (prior) return taken(prior.claim_address);

    // 2. Calculate impact (deterministic, from a transparent factor table).
    const impact = computeImpact(items);
    emit({ t: "impact", impact });

    // 3. Create the proof: hash the record.
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const hash = hashRecord({ id, userId, merchant, items, impact, createdAt });
    emit({ t: "hash", hash });

    // 4. Save first. If Solana is slow or down the record still exists and can be anchored later.
    try {
      await query(
        `INSERT INTO records (id,user_id,merchant,items,co2_kg,plastic_items,packaging_g,sustainable_items,hash,signature,created_at,receipt_fp,claim_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL,$10,$11,NULL)`,
        [id, userId, merchant, JSON.stringify(items), impact.co2Kg, impact.plasticItems, impact.packagingG, impact.sustainableItems, hash, createdAt, fp],
      );
    } catch (e) {
      if ((e as { code?: string }).code === "23505") {
        const again = (await query<{ claim_address: string | null }>("SELECT claim_address FROM records WHERE receipt_fp=$1", [fp]))[0];
        return taken(again?.claim_address);
      }
      throw e;
    }

    // 5. Anchor: one Solana transaction = claim account (the chain refuses a second claim) + the record hash as a memo.
    emit({ t: "anchoring" });
    let signature: string | null = null;
    let claimAddress: string | null = null;
    try {
      ({ signature, claimAddress } = await claimWithRetry("impact", fp, `ecoproof:v1:${hash}`));
      await query("UPDATE records SET signature=$1, claim_address=$2 WHERE id=$3", [signature, claimAddress, id]);
      emit({ t: "anchored", signature, claimAddress, claimUrl: claimUrl(claimAddress) });
    } catch (e) {
      if (e instanceof AlreadyClaimedError) {
        await query("DELETE FROM records WHERE id=$1", [id]);
        return taken(e.claimAddress);
      }
      console.error("anchoring failed after retries; record kept as pending", e);
      emit({ t: "anchor_pending" });
    }

    return { status: 200, body: { id, merchant, items, impact, hash, signature, claimAddress, claimUrl: claimAddress ? claimUrl(claimAddress) : null, pending: !signature, sample, receiptNumber, date, total } };
  } catch (e) {
    console.error(e);
    if (e instanceof Anthropic.BadRequestError) return fail(422, "We couldn't read that image. Try a clearer photo of the whole receipt.");
    if (e instanceof Anthropic.APIError) return fail(503, "Receipt scanning is busy right now. Please try again in a moment.");
    return fail(500, "Something went wrong. Please try again.");
  }
}

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

  // Streaming mode (x-stream: 1): newline-delimited JSON events, one per real pipeline stage.
  if (req.headers.get("x-stream") === "1") {
    const enc = new TextEncoder();
    const body = new ReadableStream({
      async start(controller) {
        const emit: Emit = (e) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
        const out = await run(form, file, mediaType, userId, emit);
        emit(out.status === 200 ? { t: "done", result: out.body } : { t: "error", status: out.status, ...out.body });
        controller.close();
      },
    });
    return new Response(body, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
  }

  const out = await run(form, file, mediaType, userId, () => {});
  return Response.json(out.body, { status: out.status });
}
