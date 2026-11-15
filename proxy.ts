import { NextResponse, type NextRequest } from "next/server";

/**
 * The app moved to ecoproofai.com (2026-11-15). Visitors who arrive on the old host, ecoproof.superbee.me, or on
 * www.ecoproofai.com, are sent to the final domain with their path and query intact: printed QR cards, parcel cards
 * and order emails keep working. API paths are left alone (see `matcher`): the WooCommerce plugin on shops' servers
 * posts to the host it was installed with, and a redirect would turn those POSTs into failures. Previews, localhost
 * and the final domain itself pass through untouched.
 */
const FINAL_HOST = "ecoproofai.com";
const OLD_HOSTS = new Set(["ecoproof.superbee.me", "www.ecoproofai.com"]);

export function proxy(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (!OLD_HOSTS.has(host)) return NextResponse.next();
  const url = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${FINAL_HOST}`);
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Everything except the API, Next's own assets and files with an extension (images, fonts, the plugin zip).
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};
