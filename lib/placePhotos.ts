import { randomBytes } from "node:crypto";
import { query } from "./db";
import { MAX_PHOTO_BYTES, MAX_PHOTOS, type PlacePhoto } from "./photoRules";

// Photos of a place, picked by its owner: the place itself, its products, or screenshots of an online shop. The browser shrinks
// each one to a JPEG (lib/clientPhoto.ts) and it is kept in Postgres (place_photos); the first one is the place's cover.

export class PhotoError extends Error {}

export const photoUrl = (placeId: string, id: string) => `/api/places/${placeId}/photos/${id}`;

/** A place's photos, cover first. */
export async function photosOf(placeId: string): Promise<PlacePhoto[]> {
  const rows = await query<{ id: string }>("SELECT id FROM place_photos WHERE place_id=$1 ORDER BY position, created_at", [placeId]);
  return rows.map((r) => ({ id: r.id, url: photoUrl(placeId, r.id) }));
}

/** The cover photo's URL for each place that has one. */
export async function coversOf(placeIds: string[]): Promise<Map<string, string>> {
  if (!placeIds.length) return new Map();
  const rows = await query<{ place_id: string; id: string }>(
    "SELECT DISTINCT ON (place_id) place_id, id FROM place_photos WHERE place_id = ANY($1) ORDER BY place_id, position, created_at", [placeIds],
  );
  return new Map(rows.map((r) => [r.place_id, photoUrl(r.place_id, r.id)]));
}

export async function photoBytes(placeId: string, id: string): Promise<Buffer | null> {
  return (await query<{ bytes: Buffer }>("SELECT bytes FROM place_photos WHERE place_id=$1 AND id=$2", [placeId, id]))[0]?.bytes ?? null;
}

export const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

/** Adds a photo at the end. The count is checked in the same statement, so two uploads at once can't go past the limit. */
export async function addPhoto(placeId: string, bytes: Buffer): Promise<void> {
  if (!isJpeg(bytes)) throw new PhotoError("That isn't a photo we can use. Try a JPEG, PNG or WebP.");
  if (bytes.length > MAX_PHOTO_BYTES) throw new PhotoError("That photo is too large.");
  const added = await query<{ id: string }>(
    `INSERT INTO place_photos (id, place_id, position, bytes)
     SELECT $1, $2, COALESCE(MAX(position), 0) + 1, $3 FROM place_photos WHERE place_id=$2 HAVING COUNT(*) < $4 RETURNING id`,
    [randomBytes(9).toString("base64url"), placeId, bytes, MAX_PHOTOS],
  );
  if (!added.length) throw new PhotoError(`A place can have ${MAX_PHOTOS} photos. Remove one first.`);
}

export async function removePhoto(placeId: string, id: string): Promise<void> {
  await query("DELETE FROM place_photos WHERE place_id=$1 AND id=$2", [placeId, id]);
}

/** Moves a photo to the front: it becomes the cover on the map and in the shop list. */
export async function makeCover(placeId: string, id: string): Promise<void> {
  await query("UPDATE place_photos SET position = (SELECT MIN(position) FROM place_photos WHERE place_id=$1) - 1 WHERE place_id=$1 AND id=$2", [placeId, id]);
}
