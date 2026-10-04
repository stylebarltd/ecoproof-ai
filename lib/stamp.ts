import { createHash, randomUUID } from "crypto";
import { query, type RecordRow } from "./db";
import { hashRecord } from "./solana";
import { hashInput } from "./verify";
import { AlreadyClaimedError, claimUrl, claimWithRetry } from "./claim";
import { identityGroup } from "./users";
import { distanceM, getPlace, stampDay, type StampPlace } from "./stampPlaces";
import { orderFingerprint } from "./order";
import { pointsFor, stampClass, type StampClass } from "./stampClasses";
import type { Impact, LineItem } from "./impact";

export class ClaimError extends Error { constructor(message: string, public status = 400, public extra: Record<string, unknown> = {}) { super(message); } }

export type StampSource = "qr" | "card" | "order";
export type StampResult = {
  stampClass: StampClass; points: number; // verified purchase or presence, and what it is worth toward milestones
  recordId: string; placeId: string; placeName: string; source: StampSource; day: string; impactNote: string | null;
  hash: string; signature: string | null; claimAddress: string | null; claimUrl: string | null; proofUrl: string;
};

/**
 * One valid claim = one stamp = one Solana proof. This is the single door every claim method goes through.
 * The proof is a claim account on Solana derived from (place, person, day), so "once per day per person per place" is enforced
 * on-chain as well as in the database. `source` records which door produced it (this stage: the place QR).
 */
export async function claimStamp(opts: { placeId: string; passportId: string; source?: StampSource; geo?: { lat: number; lng: number } | null; place?: StampPlace; cardCode?: string; onStep?: (s: "verify" | "anchor" | "save") => void; order?: { orderId: string; items: LineItem[]; impact: Impact; line: string } }): Promise<StampResult> {
  opts.onStep?.("verify");
  const place = opts.place ?? (await getPlace(opts.placeId));
  if (!place) throw new ClaimError("Unknown place", 404);
  const source = opts.source ?? "qr";
  if (place.status !== "active") throw new ClaimError(`${place.name} is paused while we review it, so stamps can't be collected right now.`, 423, { paused: true });
  if (place.kind === "online" && source === "qr") throw new ClaimError("This is an online shop. Collect your stamp from the card in your parcel or the link in your order email.", 422);

  if (place.gps_radius_m && place.lat != null && place.lng != null) {
    if (!opts.geo) throw new ClaimError("Share your location to collect this stamp: it must be claimed at the place.", 422, { needsGps: true });
    const d = distanceM(place.lat, place.lng, opts.geo.lat, opts.geo.lng);
    if (d > place.gps_radius_m) throw new ClaimError(`You're ${Math.round(d)} m away. Stamps for ${place.name} can only be collected at the place.`, 403, { distanceM: Math.round(d) });
  }

  const person = (await identityGroup(opts.passportId))[0]; // a linked wallet and its device ids count as one person
  const day = stampDay();
  // QR door: once per day per person per place. Card door: each printed code works exactly once, by anyone, any day.
  // Order door: each real order works exactly once; its stamp carries the order's true impact.
  const fp = opts.order
    ? orderFingerprint(place.id, opts.order.orderId)
    : opts.cardCode
    ? createHash("sha256").update(`ecoproof:stamp:v1:card:${place.id}:${opts.cardCode}`).digest("hex")
    : createHash("sha256").update(`ecoproof:stamp:v1:${place.id}:${person}:${day}`).digest("hex");
  const dup = await query<{ id: string; claim_address: string | null }>("SELECT id, claim_address FROM records WHERE receipt_fp=$1", [fp]);
  const already = (id: string | null, addr: string | null) => opts.order
    ? new ClaimError("This order has already been claimed.", 409, { recordId: id, claimAddress: addr })
    : opts.cardCode
    ? new ClaimError("This card has already been used.", 409, { recordId: id, claimAddress: addr })
    : new ClaimError(`You already collected a ${place.name} stamp today. Come back tomorrow!`, 409, { recordId: id, claimAddress: addr });
  if (dup.length) throw already(dup[0].id, dup[0].claim_address);

  const row: RecordRow = {
    id: randomUUID(), user_id: opts.passportId, merchant: place.name, items: JSON.stringify(opts.order?.items ?? []),
    co2_kg: opts.order?.impact.co2Kg ?? 0, plastic_items: opts.order?.impact.plasticItems ?? 0, packaging_g: opts.order?.impact.packagingG ?? 0, sustainable_items: opts.order?.impact.sustainableItems ?? 0,
    hash: "", signature: null, created_at: new Date().toISOString(), place_id: place.id, source,
  };
  row.hash = hashRecord(hashInput(row));

  opts.onStep?.("anchor");
  let signature: string | null = null;
  let claimAddress: string | null = null;
  try {
    ({ signature, claimAddress } = await claimWithRetry("impact", fp, `ecoproof:v1:${row.hash}`));
  } catch (e) {
    if (e instanceof AlreadyClaimedError) throw already(null, e.claimAddress);
    console.error("anchor failed; saving stamp as pending", e); // kept, and /api/records/[id]/anchor can retry it
  }
  opts.onStep?.("save");
  try {
    await query(
      `INSERT INTO records (id,user_id,merchant,items,co2_kg,plastic_items,packaging_g,sustainable_items,hash,signature,created_at,receipt_fp,claim_address,place_id,source,impact_note,brand_id,order_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [row.id, row.user_id, row.merchant, row.items, row.co2_kg, row.plastic_items, row.packaging_g, row.sustainable_items, row.hash, signature, row.created_at, fp, claimAddress, place.id, source, opts.order?.line ?? null, opts.order ? place.id : null, opts.order?.orderId ?? null],
    );
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw already(null, claimAddress);
    throw e;
  }
  return { stampClass: stampClass(source), points: pointsFor(source), recordId: row.id, placeId: place.id, placeName: place.name, source, day, impactNote: opts.order?.line ?? null, /* only a verified order carries an impact line */ hash: row.hash, signature, claimAddress, claimUrl: claimAddress ? claimUrl(claimAddress) : null, proofUrl: `/p/${row.id}` };
}
