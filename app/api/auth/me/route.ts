import { socialEnabled } from "@/lib/auth";
import { query } from "@/lib/db";
import { clearLegacyCookie, getSession } from "@/lib/session";
import { walletSignIn, withCookies } from "@/lib/signin";

/** Who is signed in, and which sign-in methods the site offers. Also moves a session from before accounts onto an account. */
export async function GET(req: Request) {
  const s = await getSession(req);
  const body = {
    signedIn: !!s, address: s?.wallet ?? null, key: s?.key ?? null, name: s?.name ?? null, email: s?.email ?? null, image: s?.image ?? null,
    methods: s?.methods ?? [], social: socialEnabled(),
    /** How many places they run (owner or staff), for the "My shop" link. */
    shops: s ? (await query<{ n: number }>("SELECT COUNT(DISTINCT place_id)::int n FROM place_members WHERE member_key = ANY($1)", [s.keys]))[0].n : 0,
  };
  if (s && !s.userId && s.wallet) {
    // The old cookie proves a wallet sign-in within the last 30 days: give that wallet its account session and retire the cookie.
    const r = await walletSignIn(req.headers, s.wallet);
    if (r.ok) return withCookies(body, [...r.cookies, clearLegacyCookie()]);
  }
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
