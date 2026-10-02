import { randomUUID } from "crypto";
import { query } from "@/lib/db";
import { extractReceipt } from "@/lib/extract";
import { computeImpact } from "@/lib/impact";
import { anchorHash, hashRecord } from "@/lib/solana";

export const maxDuration = 60;
const TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("receipt");
  const userId = String(form.get("userId") || "demo-user");
  if (!(file instanceof File)) return Response.json({ error: "receipt file required" }, { status: 400 });
  const mediaType = TYPES.find((t) => t === file.type);
  if (!mediaType) return Response.json({ error: "unsupported image type" }, { status: 400 });

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const { merchant, items } = await extractReceipt(base64, mediaType);
    const impact = computeImpact(items);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const hash = hashRecord({ id, userId, merchant, items, impact, createdAt });

    let signature: string | null = null;
    try {
      signature = await anchorHash(hash);
    } catch (e) {
      console.error("anchor failed", e);
    }

    await query(
      `INSERT INTO records (id,user_id,merchant,items,co2_kg,plastic_items,packaging_g,sustainable_items,hash,signature,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, userId, merchant, JSON.stringify(items), impact.co2Kg, impact.plasticItems, impact.packagingG, impact.sustainableItems, hash, signature, createdAt],
    );

    return Response.json({ id, merchant, items, impact, hash, signature });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
