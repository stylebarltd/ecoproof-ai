import { randomInt } from "crypto";
import { query } from "./db";
import { appUrl } from "./nft";
import { ClaimError, claimStamp, type StampResult } from "./stamp";
import { getPlace } from "./stampPlaces";

// Printed-card door: unique single-use codes for the parcel. The shop needs no code; EcoProof generates the cards to print.
// A card proves nothing about an order, so its stamp is generic: no impact number.

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L: easy to type from a card
export const normaliseCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const cardUrl = (code: string) => `${appUrl()}/k/${code}`;
const newCode = () => Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(""); // 31^10 ≈ 2^49: not guessable

export async function createCards(placeId: string, count: number): Promise<{ batch: string; codes: string[] }> {
  const batch = `b${Date.now().toString(36)}${newCode().slice(0, 3).toLowerCase()}`;
  const codes: string[] = [];
  while (codes.length < count) {
    const c = newCode();
    const r = await query("INSERT INTO claim_cards (code, place_id, batch) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING code", [c, placeId, batch]);
    if (r.length) codes.push(c);
  }
  return { batch, codes };
}

export type Card = { code: string; place_id: string; claimed_at: string | null };
export async function getCard(code: string): Promise<Card | null> {
  return (await query<Card>("SELECT code, place_id, claimed_at FROM claim_cards WHERE code=$1", [normaliseCode(code)]))[0] ?? null;
}

/** Redeem a card: reserve it atomically, then stamp. A failed attempt releases the card so the customer can retry. */
export async function claimCard(code: string, passportId: string, onStep?: (s: "verify" | "anchor" | "save") => void): Promise<StampResult> {
  const c = normaliseCode(code);
  const card = await getCard(c);
  if (!card) throw new ClaimError("This card isn't valid.", 404);
  const place = await getPlace(card.place_id);
  if (!place) throw new ClaimError("This card isn't valid.", 404);
  const reserved = await query("UPDATE claim_cards SET claimed_at=now() WHERE code=$1 AND claimed_at IS NULL RETURNING code", [c]);
  if (!reserved.length) throw new ClaimError("This card has already been used.", 409);
  try {
    const stamp = await claimStamp({ placeId: place.id, passportId, source: "card", cardCode: c, place, onStep });
    await query("UPDATE claim_cards SET record_id=$2 WHERE code=$1", [c, stamp.recordId]);
    return stamp;
  } catch (e) {
    const used = e instanceof ClaimError && e.status === 409; // already stamped for this code: keep it used
    if (!used) await query("UPDATE claim_cards SET claimed_at=NULL WHERE code=$1", [c]);
    throw e;
  }
}
