import Anthropic from "@anthropic-ai/sdk";
import { query } from "./db";
import { hmac } from "./secret";
import { ClaimError, claimStamp, type StampResult } from "./stamp";
import { isClaimed, receiptFingerprint } from "./claim";
import { recordLines } from "./match";
import { matchItems, type Matched } from "./order";
import { computeImpact, FACTORS, type Impact } from "./impact";
import { impactLine } from "./woo";
import { distanceM, getPlace, PLACE_COLS, stampDay, type StampPlace } from "./stampPlaces";

/**
 * The receipt door (v2, 2026-11-15): a paper receipt from an eco shop, photographed IN the shop, becomes a verified
 * purchase. Two requests:
 *   1. POST /api/receipts/read  (photo + GPS) → readReceipt(): which eco shop (only ones within NEARBY_M of the
 *      shopper count), what was bought (Claude reads the photo into a strict shape), each line sorted into an impact
 *      category exactly as an online order is (matchItems: the shop's own confirmed numbers, its catalogue, then the
 *      AI), the receipt's fingerprint checked against the database and the chain. Nothing is stored; the review the
 *      shopper sees comes back with a signed token that expires.
 *   2. POST /api/claims { receiptToken } → claimReceipt(): the token is verified, the shopper's position is checked
 *      against the shop's location again, and the stamp goes through claimStamp like every other door, with the
 *      fingerprint from the printed number + date + total as the once-only key on Solana.
 * The photo itself is never kept: only the lines (names, quantities, categories) that every verified stamp keeps.
 * In-shop only for now (Pola, 2026-11-15); the at-home variant (3 points) is not built.
 */

const MODEL = process.env.RECEIPT_MODEL ?? "claude-sonnet-5-5";
const NEARBY_M = 400;            // eco shops this close to the shopper are the candidates for the merchant
const DEFAULT_RADIUS_M = 150;    // the in-shop check when a place has no gps_radius_m of its own
const MAX_AGE_DAYS = 7;          // older receipts are not accepted (Pola's rule)
const TOKEN_TTL_MS = 15 * 60_000;
const MAX_ITEMS = 60;

export type Candidate = { place: StampPlace; lat: number; lng: number; locationName: string | null; distanceM: number };
export type ReviewItem = { name: string; quantity: number; category: string; label: string; counts: boolean };
export type ReceiptReview = {
  token: string; expiresAt: string;
  placeId: string; placeName: string; date: string; total: number | null; currency: string; receiptNumber: string;
  items: ReviewItem[]; impact: Impact; line: string; estimate: boolean; points: number;
};
type TokenPayload = {
  v: 1; passportId: string; placeId: string; lat: number; lng: number; fp: string; date: string;
  items: Matched[]; impact: Impact; line: string; exp: number;
};

/** Active eco shops with a location within NEARBY_M of the shopper, nearest location per shop, nearest shop first. */
export async function nearbyEcoShops(geo: { lat: number; lng: number }, radiusM = NEARBY_M): Promise<Candidate[]> {
  const rows = await query<StampPlace & { loc_lat: number; loc_lng: number; loc_name: string | null }>(
    `SELECT ${PLACE_COLS}, l.lat AS loc_lat, l.lng AS loc_lng, l.name AS loc_name
       FROM stamp_places p JOIN stamp_place_locations l ON l.place_id = p.id
      WHERE p.kind = 'eco_shop' AND p.status = 'active'`,
  );
  const best = new Map<string, Candidate>();
  for (const r of rows) {
    const d = distanceM(r.loc_lat, r.loc_lng, geo.lat, geo.lng);
    if (d > radiusM) continue;
    const prev = best.get(r.id);
    if (!prev || d < prev.distanceM) {
      const { loc_lat, loc_lng, loc_name, ...place } = r;
      best.set(r.id, { place: place as StampPlace, lat: loc_lat, lng: loc_lng, locationName: loc_name, distanceM: d });
    }
  }
  return [...best.values()].sort((a, b) => a.distanceM - b.distanceM);
}

type Read = {
  legible: boolean; merchant_name: string; matched_place_id: string; date: string; receipt_number: string;
  total: number; currency: string; items: { name: string; quantity: number }[]; confidence: number;
};

const SYSTEM = `You read shop receipts for EcoProof AI, an eco passport. Report only what is printed; never invent lines.
- date: the purchase date as YYYY-MM-DD. Thai receipts often print the Buddhist year (2569 = 2026): convert it. Empty string if no date is printed.
- receipt_number: the printed receipt, bill, invoice or transaction number, or empty string.
- total: the grand total paid as a number, or 0 if none is printed. currency: the ISO code when printed (THB, USD …), else empty.
- merchant_name: the shop's name as printed. matched_place_id: the id of the candidate whose name matches that merchant (same shop, allowing abbreviations, Thai/English spellings and branch suffixes), or empty string when none matches.
- items: one entry per purchased product line, with its quantity (1 when not printed). Skip subtotals, totals, tax, service charges, discounts, deposits, payment and change lines.
- legible: false when the picture is not a receipt or cannot be read well enough to list its items.`;

/** One photo in, a review out. Throws ClaimError with a message the shopper can act on. */
export async function readReceipt(opts: { imageBase64: string; mediaType: "image/jpeg" | "image/png" | "image/webp"; geo: { lat: number; lng: number }; passportId: string }): Promise<ReceiptReview> {
  const candidates = await nearbyEcoShops(opts.geo);
  if (!candidates.length) {
    throw new ClaimError("There is no EcoProof AI eco shop at your location. Receipts can only be scanned in the shop, and the shop has to be on EcoProof AI.", 422, { noShopNearby: true });
  }
  if (!process.env.ANTHROPIC_API_KEY) throw new ClaimError("Receipt scanning is not available right now.", 503);

  const ids = candidates.map((c) => c.place.id);
  const schema = {
    type: "object",
    properties: {
      legible: { type: "boolean" },
      merchant_name: { type: "string" },
      matched_place_id: { type: "string", enum: [...ids, ""] },
      date: { type: "string" },
      receipt_number: { type: "string" },
      total: { type: "number" },
      currency: { type: "string" },
      items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, quantity: { type: "integer" } }, required: ["name", "quantity"], additionalProperties: false } },
      confidence: { type: "number" },
    },
    required: ["legible", "merchant_name", "matched_place_id", "date", "receipt_number", "total", "currency", "items", "confidence"],
    additionalProperties: false,
  };
  const candidateText = candidates.map((c) => `- id "${c.place.id}": ${c.place.name}${c.locationName ? ` (${c.locationName})` : ""}, ${Math.round(c.distanceM)} m from the shopper`).join("\n");

  let read: Read;
  try {
    const res = await new Anthropic().messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { format: { type: "json_schema", schema } },
      system: SYSTEM,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: opts.mediaType, data: opts.imageBase64 } },
          { type: "text", text: `Candidate shops near the shopper:\n${candidateText}\n\nRead this receipt.` },
        ],
      }],
    });
    const block = res.content.find((b) => b.type === "text");
    read = JSON.parse(block && "text" in block ? block.text : "{}") as Read;
  } catch (e) {
    console.error("receipt read failed", e);
    throw new ClaimError("We couldn't read the receipt right now. Please try again in a moment.", 502, { retry: true });
  }

  if (!read.legible) throw new ClaimError("We couldn't read that receipt. Lay it flat, fill the frame and make sure the light is good, then try again.", 422, { retake: true });
  const match = candidates.find((c) => c.place.id === read.matched_place_id);
  if (!match || !namesAgree(read.merchant_name, match.place.name)) {
    const who = clean(read.merchant_name, 60);
    throw new ClaimError(who ? `This receipt is from ${who}, which isn't an EcoProof AI shop yet. Ask them to join!` : "We couldn't match this receipt to an EcoProof AI shop here.", 422, { noShop: true, merchant: who });
  }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(read.date) ? read.date : "";
  if (!date) throw new ClaimError("We couldn't find the date on this receipt. Make sure the top of the receipt is in the photo.", 422, { retake: true });
  const age = daysBetween(date, stampDay());
  if (age < -1) throw new ClaimError("That receipt is dated in the future. Check the photo and try again.", 422, { retake: true });
  if (age > MAX_AGE_DAYS) throw new ClaimError(`Receipts can be scanned within ${MAX_AGE_DAYS} days of the purchase. This one is from ${date}.`, 410, { tooOld: true });

  const items = (read.items || [])
    .map((i) => ({ name: clean(i.name, 120), quantity: Math.min(1000, Math.max(1, Math.round(Number(i.quantity) || 1))) }))
    .filter((i) => i.name)
    .slice(0, MAX_ITEMS);
  if (!items.length) throw new ClaimError("We couldn't find any purchased items on this receipt.", 422, { retake: true });

  const total = Number.isFinite(read.total) && read.total > 0 ? Math.round(read.total * 100) / 100 : 0;
  const receiptNumber = clean(read.receipt_number, 40);
  // No number and no total would make every receipt of a day look alike: ask for a better photo instead of guessing.
  if (!receiptNumber && !total) throw new ClaimError("We couldn't read the receipt number or the total. Please take the photo again with the whole receipt in it.", 422, { retake: true });
  const fp = receiptFingerprint({ receiptNumber, date, total, merchant: match.place.id, scope: `receipt:${match.place.id}` });

  const dup = await query<{ id: string }>("SELECT id FROM records WHERE receipt_fp=$1", [fp]);
  if (dup.length || (await isClaimed("impact", fp).catch(() => false))) throw new ClaimError("This receipt has already been claimed.", 409, { already: true });

  // Each line into an impact category, the same way an online order is: the shop's own numbers, its catalogue, then the AI.
  const matched = await matchItems({ brandId: match.place.id, orderId: fp, items });
  const impact = computeImpact(matched);
  if (impact.sustainableItems <= 0) {
    throw new ClaimError("Nothing on this receipt counts as a plastic-free swap yet, so it can't earn a verified stamp.", 422, { nothingEco: true });
  }
  const line = impactLine(impact, matched);
  const estimate = matched.some((i) => i.impactSource !== "shop" && i.category !== "not_sustainable");

  const exp = Date.now() + TOKEN_TTL_MS;
  const payload: TokenPayload = { v: 1, passportId: opts.passportId, placeId: match.place.id, lat: match.lat, lng: match.lng, fp, date, items: matched, impact, line, exp };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return {
    token: `${body}.${hmac("receipt", body)}`, expiresAt: new Date(exp).toISOString(),
    placeId: match.place.id, placeName: match.place.name, date, total: total || null, currency: clean(read.currency, 3).toUpperCase(), receiptNumber,
    items: matched.map((i) => ({ name: i.name, quantity: i.quantity, category: i.category, label: FACTORS[i.category]?.label ?? i.category, counts: i.category !== "not_sustainable" })),
    impact, line, estimate, points: 5,
  };
}

/** The confirmed review becomes a stamp. The shopper must still be at the shop. */
export async function claimReceipt(token: string, passportId: string, geo: { lat: number; lng: number } | null, onStep?: (s: "verify" | "anchor" | "save") => void): Promise<StampResult> {
  const [body, sig] = String(token).split(".");
  if (!body || !sig || hmac("receipt", body) !== sig) throw new ClaimError("This receipt review has expired. Please scan the receipt again.", 400, { retake: true });
  let p: TokenPayload;
  try { p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload; } catch { throw new ClaimError("This receipt review is not valid.", 400); }
  if (p.v !== 1 || p.passportId !== passportId) throw new ClaimError("This receipt review belongs to another passport.", 403);
  if (Date.now() > p.exp) throw new ClaimError("This receipt review has expired. Please scan the receipt again.", 410, { retake: true });

  const place = await getPlace(p.placeId);
  if (!place) throw new ClaimError("Unknown place", 404);
  if (!geo) throw new ClaimError("Share your location to collect this stamp: a receipt is scanned in the shop.", 422, { needsGps: true });
  const radius = place.gps_radius_m ?? DEFAULT_RADIUS_M;
  const d = distanceM(p.lat, p.lng, geo.lat, geo.lng);
  if (d > radius) throw new ClaimError(`You're ${Math.round(d)} m from ${place.name}. A receipt is scanned in the shop.`, 403, { distanceM: Math.round(d) });

  // claimStamp re-checks the position against the place's own point; give it the matched location, so a shop with
  // several locations is checked at the one the shopper is standing in.
  const stamp = await claimStamp({
    placeId: place.id, passportId, source: "receipt", geo, onStep,
    place: { ...place, lat: p.lat, lng: p.lng, gps_radius_m: radius },
    receipt: { fp: p.fp, items: p.items, impact: p.impact, line: p.line },
  });
  // Keep the lines against the shop's declared products: the ones that match nothing go to the owner's queue (lib/match.ts). The stamp
  // and its impact don't depend on it yet, so a failure here never loses the stamp.
  await recordLines(place.id, stamp.recordId, p.items.map((i) => ({ rawText: i.name }))).catch((e) => console.error("receipt lines not recorded", e));
  return stamp;
}

// ---- helpers ------------------------------------------------------------------------------------------------------

const clean = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** Days from `from` to `to` (both YYYY-MM-DD); negative when `from` is later. */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** A guard behind the model's match: the printed merchant and the place name must share a real word, or one contains the other. */
export function namesAgree(printed: string, placeName: string): boolean {
  const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9฀-๿]+/g, " ").trim();
  const a = norm(printed), b = norm(placeName);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const stop = new Set(["the", "shop", "store", "co", "ltd", "company", "cafe", "and", "ร้าน", "บริษัท", "จำกัด"]);
  const words = (s: string) => new Set(s.split(" ").filter((w) => w.length >= 3 && !stop.has(w)));
  const wa = words(a);
  for (const w of words(b)) if (wa.has(w)) return true;
  return false;
}
