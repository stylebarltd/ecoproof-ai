// Published eco practices. The owner's checklist (place_practices) is a private draft; publishing freezes it into a declaration
// (practice_declarations) whose SHA-256 is written to Solana as a memo, with a claim account so each declaration is anchored once.
// A declaration is never edited or deleted. Publishing again adds a new version; the latest one is what the public sees.
import { randomUUID } from "crypto";
import { query } from "./db";
import { AlreadyClaimedError, claimAddressOf, claimUrl, claimWithRetry, findClaimSignature, isClaimed } from "./claim";
import { checklist, practicesOf, rating, type Answers } from "./practices";
import { explorerUrl, hashRecord, readMemo } from "./solana";
import { stampDay } from "./stampPlaces";
import type { Verification } from "./verify";

export type DeclarationRow = {
  id: string; place_id: string; version: number; kind: string; also_cafe: boolean; answers: string; checklist_hash: string;
  score: number; stars: number; declared_by: string; created_at: string; hash: string; signature: string | null; claim_address: string | null;
};

/** What the owner and the public see about one declaration. */
export type Declaration = {
  id: string; version: number; kind: string; alsoCafe: boolean; answers: Answers; score: number; stars: number; createdAt: string;
  hash: string; pending: boolean; txUrl: string | null; claimUrl: string;
};

export const declarationMemo = (hash: string) => `EcoProof AI declaration v1: ${hash}`;

/** Only the answers to this checklist, keys sorted, so the same answers always hash the same. */
function frozen(kind: string, alsoCafe: boolean, answers: Answers): Answers {
  const ids = new Set(practicesOf(checklist(kind, alsoCafe) ?? []).map((p) => p.id));
  return Object.fromEntries(Object.entries(answers).filter(([id]) => ids.has(id)).sort(([a], [b]) => a.localeCompare(b)));
}

/** Fingerprint of the checklist the owner answered (labels and points), so a declaration says exactly what was asked. */
const checklistHash = (kind: string, alsoCafe: boolean) => hashRecord(checklist(kind, alsoCafe));

/** The exact object that is hashed. Key order matters. */
export function hashInput(d: DeclarationRow) {
  return {
    type: "practice_declaration",
    id: d.id, placeId: d.place_id, version: d.version, kind: d.kind, alsoCafe: d.also_cafe,
    answers: JSON.parse(d.answers), checklist: d.checklist_hash, score: d.score, stars: d.stars,
    declaredBy: d.declared_by, createdAt: new Date(d.created_at).toISOString(),
  };
}

export function toDeclaration(d: DeclarationRow): Declaration {
  return {
    id: d.id, version: d.version, kind: d.kind, alsoCafe: d.also_cafe, answers: JSON.parse(d.answers), score: d.score, stars: d.stars,
    createdAt: new Date(d.created_at).toISOString(), hash: d.hash, pending: !d.signature,
    txUrl: d.signature ? explorerUrl(d.signature) : null, claimUrl: claimUrl(claimAddressOf("declaration", d.id)),
  };
}

/** A new declaration row (not saved), hashed. */
export function buildDeclaration(place: { id: string; kind: string; also_cafe: boolean }, answers: Answers, version: number, by: string): DeclarationRow {
  const a = frozen(place.kind, place.also_cafe, answers);
  const r = rating(place.kind, place.also_cafe, a)!;
  const d: DeclarationRow = {
    id: randomUUID(), place_id: place.id, version, kind: place.kind, also_cafe: place.also_cafe, answers: JSON.stringify(a),
    checklist_hash: checklistHash(place.kind, place.also_cafe), score: r.score, stars: r.stars, declared_by: by,
    created_at: new Date().toISOString(), hash: "", signature: null, claim_address: null,
  };
  d.hash = hashRecord(hashInput(d));
  return d;
}

const COLS = "id, place_id, version, kind, also_cafe, answers, checklist_hash, score, stars, declared_by, created_at, hash, signature, claim_address";

export async function insertDeclaration(d: DeclarationRow) {
  await query(
    `INSERT INTO practice_declarations (${COLS}) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [d.id, d.place_id, d.version, d.kind, d.also_cafe, d.answers, d.checklist_hash, d.score, d.stars, d.declared_by, d.created_at, d.hash, d.signature, d.claim_address],
  );
}

export async function getDeclaration(id: string): Promise<DeclarationRow | null> {
  return (await query<DeclarationRow>(`SELECT ${COLS} FROM practice_declarations WHERE id=$1`, [id]))[0] ?? null;
}

/** Every version of a place's declaration, newest first. */
export const declarationsOf = (placeId: string) =>
  query<DeclarationRow>(`SELECT ${COLS} FROM practice_declarations WHERE place_id=$1 ORDER BY version DESC`, [placeId]);

/** The latest declaration per place. */
export async function latestDeclarations(placeIds: string[]): Promise<Map<string, DeclarationRow>> {
  if (!placeIds.length) return new Map();
  const rows = await query<DeclarationRow>(`SELECT DISTINCT ON (place_id) ${COLS} FROM practice_declarations WHERE place_id = ANY($1) ORDER BY place_id, version DESC`, [placeIds]);
  return new Map(rows.map((r) => [r.place_id, r]));
}

/** The answers the public sees: the latest declaration's, as long as it was made for the place's current type. A place whose type
 *  changed since has nothing published for its new checklist. */
export function publishedAnswers(place: { kind: string; also_cafe: boolean }, d: DeclarationRow | undefined): Answers {
  return d && d.kind === place.kind && d.also_cafe === place.also_cafe ? JSON.parse(d.answers) : {};
}

/** True when the draft differs from what was last published (or nothing was). */
export function differsFromPublished(place: { kind: string; also_cafe: boolean }, draft: Answers, d: DeclarationRow | undefined): boolean {
  if (!d) return true;
  return d.kind !== place.kind || d.also_cafe !== place.also_cafe || d.answers !== JSON.stringify(frozen(place.kind, place.also_cafe, draft));
}

/** Once per day (Thailand), so stars can't be flipped back and forth. */
export const publishedToday = (d: DeclarationRow | undefined) => !!d && stampDay(new Date(d.created_at)) === stampDay();

export class DeclarationError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export type PublishStep = "check" | "seal" | "anchor";

/** Publishes the saved draft as a new declaration and anchors it. If Solana is down the declaration still counts and its proof
 *  stays pending until anchorDeclaration succeeds. onStep reports progress for the owner's screen. */
export async function publish(place: { id: string; kind: string; also_cafe: boolean }, draft: Answers, by: string, onStep?: (s: PublishStep) => void): Promise<DeclarationRow> {
  onStep?.("check");
  if (!checklist(place.kind, place.also_cafe)) throw new DeclarationError("Only cafés, restaurants and hotels have an eco checklist to publish.");
  const last = (await latestDeclarations([place.id])).get(place.id);
  if (!differsFromPublished(place, draft, last)) throw new DeclarationError("Nothing has changed since your last published declaration.", 409);
  if (publishedToday(last)) throw new DeclarationError("You've already published today. You can publish your changes again tomorrow.", 429);

  onStep?.("seal");
  const d = buildDeclaration(place, draft, (last?.version ?? 0) + 1, by);
  try {
    await insertDeclaration(d);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw new DeclarationError("This was just published from another screen. Reload the page.", 409);
    throw e;
  }
  onStep?.("anchor");
  return anchorDeclaration(d);
}

/** Writes a declaration's hash to Solana (once: the claim account is keyed on its id). Safe to call again; returns the row as stored. */
export async function anchorDeclaration(d: DeclarationRow): Promise<DeclarationRow> {
  if (d.signature) return d;
  let signature: string, claimAddress: string;
  try {
    ({ signature, claimAddress } = await claimWithRetry("declaration", d.id, declarationMemo(d.hash)));
  } catch (e) {
    // Anchored earlier, but the database update didn't happen: take the signature from the chain.
    const sig = e instanceof AlreadyClaimedError ? await findClaimSignature("declaration", d.id).catch(() => null) : null;
    if (!sig) { console.error("declaration anchor failed; pending", d.id, e); return d; }
    signature = sig; claimAddress = (e as AlreadyClaimedError).claimAddress;
  }
  await query("UPDATE practice_declarations SET signature=$1, claim_address=$2 WHERE id=$3 AND signature IS NULL", [signature, claimAddress, d.id]);
  return { ...d, signature, claim_address: claimAddress };
}

/** Recomputes the hash from the stored data and compares it with the memo on Solana. */
export async function verifyDeclaration(d: DeclarationRow): Promise<Verification> {
  const recomputedHash = hashRecord(hashInput(d));
  const v: Verification = { dataIntact: recomputedHash === d.hash, anchored: !!d.signature, onChainMatch: false, recomputedHash, storedHash: d.hash, claimed: null };
  try {
    v.claimed = await isClaimed("declaration", d.id);
    v.claimUrl = claimUrl(claimAddressOf("declaration", d.id));
  } catch { /* leave null if the RPC is unavailable */ }
  if (!d.signature) return v;
  try {
    const chain = await readMemo(d.signature);
    if (!chain) { v.error = "Transaction not found on devnet"; return v; }
    v.slot = chain.slot;
    if (chain.blockTime) v.blockTime = new Date(chain.blockTime * 1000).toISOString();
    v.onChainMatch = chain.memo === declarationMemo(recomputedHash);
  } catch (e) {
    v.error = e instanceof Error ? e.message : "RPC error";
  }
  return v;
}
