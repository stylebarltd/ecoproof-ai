import { anchorDeclaration, getDeclaration, toDeclaration } from "@/lib/declarations";
import { rateLimited } from "@/lib/ratelimit";

export const maxDuration = 60;

/** Anchors a published declaration whose proof is still pending (Solana was slow or down). Safe to call repeatedly. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip, 40)) return Response.json({ error: "Too many requests" }, { status: 429 });
  const d = await getDeclaration((await params).id);
  if (!d) return Response.json({ error: "not found" }, { status: 404 });
  const anchored = await anchorDeclaration(d);
  if (!anchored.signature) return Response.json({ error: "Solana is slow right now. Please try again in a moment." }, { status: 503 });
  return Response.json(toDeclaration(anchored));
}
