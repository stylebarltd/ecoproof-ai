import { memberOf } from "@/lib/members";
import { MAX_PHOTO_BYTES, MAX_PHOTOS } from "@/lib/photoRules";
import { addPhoto, makeCover, PhotoError, photosOf, removePhoto } from "@/lib/placePhotos";
import { rateLimited } from "@/lib/ratelimit";

const list = async (id: string, role: string) => Response.json({ role, max: MAX_PHOTOS, photos: await photosOf(id) }, { headers: { "Cache-Control": "no-store" } });

/** The place's photos, cover first. Staff can look; only the owner changes them. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const m = await memberOf(req, id);
  if (m instanceof Response) return m;
  return list(id, m.role);
}

/** Adds a photo: the body is the JPEG itself, already shrunk by the browser (lib/clientPhoto.ts). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const m = await memberOf(req, id, "owner");
  if (m instanceof Response) return m;
  if (rateLimited(`photo:${m.s.key}`, 60)) return Response.json({ error: "Too many uploads, try again later" }, { status: 429 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_PHOTO_BYTES) return Response.json({ error: "That photo is too large." }, { status: 413 });
  try { await addPhoto(id, Buffer.from(await req.arrayBuffer())); }
  catch (e) { if (e instanceof PhotoError) return Response.json({ error: e.message }, { status: 400 }); throw e; }
  return list(id, m.role);
}

/** Body { cover: photoId }: that photo goes first. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const m = await memberOf(req, id, "owner");
  if (m instanceof Response) return m;
  const b = (await req.json().catch(() => ({}))) as { cover?: string };
  if (typeof b.cover !== "string" || !b.cover) return Response.json({ error: "cover must be a photo id" }, { status: 400 });
  await makeCover(id, b.cover);
  return list(id, m.role);
}

/** ?photo=<id> removes that photo. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const m = await memberOf(req, id, "owner");
  if (m instanceof Response) return m;
  await removePhoto(id, new URL(req.url).searchParams.get("photo") ?? "");
  return list(id, m.role);
}
