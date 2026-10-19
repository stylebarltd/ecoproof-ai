import { getDeclaration, verifyDeclaration } from "@/lib/declarations";

export const maxDuration = 30;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const d = await getDeclaration((await params).id);
  if (!d) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(await verifyDeclaration(d));
}
