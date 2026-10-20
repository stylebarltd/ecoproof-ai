import { listShops } from "@/lib/shops";

/** The eco shop directory: every active shop, in store or online, with its impact and where it is based or ships from. */
export async function GET() {
  return Response.json(await listShops());
}
