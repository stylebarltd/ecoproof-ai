import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { orm, query } from "./db";
import { accountKey } from "./ids";
import { authAccount, authSession, authUser, authVerification } from "./schema";
import { secret } from "./secret";
import { solanaWallet } from "./solanaAuth";

// Accounts and sessions (Better Auth, stored in our Postgres). Sign-in methods: a Solana wallet (lib/solanaAuth.ts) and Google.
// Its routes live under /api/account (app/api/account/[...all]); our own /api/auth routes handle the wallet's signature first.

export const AUTH_BASE_PATH = "/api/account";
export const googleEnabled = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const PRODUCTION = "https://ecoproof.superbee.me";

function create() {
  return betterAuth({
    appName: "EcoProof AI",
    basePath: AUTH_BASE_PATH,
    secret: secret(),
    // The site answers on its own domain, Vercel previews and localhost: build links (e.g. Google's return address) from the host asked for.
    baseURL: {
      allowedHosts: ["ecoproof.superbee.me", "ecoproof-*-stylebar.vercel.app", "ecoproof-ai-*-stylebar.vercel.app", "localhost:*", "127.0.0.1:*"],
      fallback: process.env.APP_URL || PRODUCTION,
    },
    database: drizzleAdapter(orm(), {
      provider: "pg",
      schema: { user: authUser, session: authSession, account: authAccount, verification: authVerification },
    }),
    socialProviders: googleEnabled()
      ? { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET!, prompt: "select_account" } }
      : {},
    account: {
      // A wallet account has no real email, so linking Google to it (or a wallet to a Google account) must not require matching emails.
      accountLinking: { enabled: true, allowDifferentEmails: true, trustedProviders: ["google", "solana"] },
    },
    session: { expiresIn: 30 * 24 * 3600, updateAge: 24 * 3600 },
    user: {
      deleteUser: {
        enabled: true,
        // Devices linked to the account (and not to one of its wallets) become anonymous passports again.
        beforeDelete: async (user) => { await query("DELETE FROM user_links WHERE wallet=$1", [accountKey(user.id)]); },
      },
    },
    advanced: { cookiePrefix: "ecoproof" },
    telemetry: { enabled: false },
    plugins: [solanaWallet()],
  });
}

const g = globalThis as unknown as { _auth?: ReturnType<typeof create> };
/** Created on first use, not at import: the build imports routes without a database. */
export const auth = () => (g._auth ??= create());
