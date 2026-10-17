import { auth } from "@/lib/auth";
import { clearLegacyCookie } from "@/lib/session";
import { withCookies } from "@/lib/signin";

/** Signs out on this device: ends the account session (if any) and clears a session cookie from before accounts. */
export async function POST(req: Request) {
  let cookies: string[] = [];
  try { cookies = (await auth().api.signOut({ headers: req.headers, returnHeaders: true })).headers.getSetCookie(); } catch { /* no account session */ }
  return withCookies({ ok: true }, [...cookies, clearLegacyCookie()]);
}
