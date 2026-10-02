import { query, type RecordRow } from "@/lib/db";
import { verifyRecord } from "@/lib/verify";

export const maxDuration = 30;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rec = (await query<RecordRow>("SELECT * FROM records WHERE id=$1", [id]))[0];
  if (!rec) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(await verifyRecord(rec));
}
