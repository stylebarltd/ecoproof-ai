import { isAdmin } from "@/lib/adminAuth";
import { listReports } from "@/lib/moderation";

/** Open reports and paused/suspended places. ADMIN_TOKEN required. */
export async function GET(req: Request) {
  if (!isAdmin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json({ places: await listReports() });
}
