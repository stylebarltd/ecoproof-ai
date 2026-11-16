import { productPhoto } from "@/lib/products";

/** A product's photo. Its URL carries a version (?v=) that changes with the photo, so it can be cached for good. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; product: string }> }) {
  const { id, product } = await params;
  const bytes = await productPhoto(id, product);
  if (!bytes) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
