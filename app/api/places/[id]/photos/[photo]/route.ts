import { photoBytes } from "@/lib/placePhotos";

/** One of a place's photos. A photo's id never gets new content (a changed photo is a new id), so it can be cached for good. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; photo: string }> }) {
  const { id, photo } = await params;
  const bytes = await photoBytes(id, photo);
  if (!bytes) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
