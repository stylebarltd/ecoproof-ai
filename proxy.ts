import { NextResponse, type NextRequest } from "next/server";

/**
 * The app lives at ecoproof.app (since 2026-11-18). Visitors who arrive on the earlier domain, ecoproofai.com, or on a
 * www host, are sent to the final domain with their path and query intact: printed QR cards, parcel cards and order
 * emails keep working. API paths are left alone (see `matcher`): the WooCommerce plugin on shops' servers
 * posts to the host it was installed with, and a redirect would turn those POSTs into failures. Previews, localhost
 * and the final domain itself pass through untouched.
 */
const FINAL_HOST = "ecoproof.app";
const OLD_HOSTS = new Set(["www.ecoproof.app", "ecoproofai.com", "www.ecoproofai.com"]);

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
