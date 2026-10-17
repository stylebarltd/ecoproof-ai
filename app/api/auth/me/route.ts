import { googleEnabled } from "@/lib/auth";
import { clearLegacyCookie, getSession } from "@/lib/session";
import { walletSignIn, withCookies } from "@/lib/signin";

/** Who is signed in, and which sign-in methods the site offers. Also moves a session from before accounts onto an account. */
export async function GET(req: Request) {
  const s = await getSession(req);
  const body = {
    signedIn: !!s, address: s?.wallet ?? null, key: s?.key ?? null, name: s?.name ?? null, email: s?.email ?? null, image: s?.image ?? null,
    methods: s?.methods ?? [], google: googleEnabled(),
  };
  if (s && !s.userId && s.wallet) {
    // The old cookie proves a wallet sign-in within the last 30 days: give that wallet its account session and retire the cookie.
    const r = await walletSignIn(req.headers, s.wallet);
    if (r.ok) return withCookies(body, [...r.cookies, clearLegacyCookie()]);
  }
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
