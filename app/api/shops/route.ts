import { visitorCountry } from "@/lib/shipping";
import { listShops } from "@/lib/shops";

/** The eco shop directory: every active shop, in store or online, with its impact and, for the visitor's country (Vercel's IP
 *  country, or ?country=US to test), the origin it ships from. */
export async function GET(req: Request) {
  const country = visitorCountry(req);
  return Response.json({ country, shops: await listShops(country) }, { headers: { "Cache-Control": "private, no-store" } });
}
