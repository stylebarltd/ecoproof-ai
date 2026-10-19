import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { orm, query } from "./db";
import { accountKey } from "./ids";
import { authAccount, authSession, authUser, authVerification } from "./schema";
import { secret } from "./secret";
import { solanaWallet, socialPlaceholderEmail } from "./solanaAuth";

// Accounts and sessions (Better Auth, stored in our Postgres). Sign-in methods: a Solana wallet (lib/solanaAuth.ts), Google and Facebook.
// Its routes live under /api/account (app/api/account/[...all]); our own /api/auth routes handle the wallet's signature first.

export const AUTH_BASE_PATH = "/api/account";

export const SOCIAL_PROVIDERS = ["google", "facebook"] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];
const keys = (p: SocialProvider) => ({ clientId: process.env[`${p.toUpperCase()}_CLIENT_ID`], clientSecret: process.env[`${p.toUpperCase()}_CLIENT_SECRET`] });
/** The social sign-ins the site offers: each one only once both of its keys are set. */
export const socialEnabled = (): SocialProvider[] => SOCIAL_PROVIDERS.filter((p) => { const k = keys(p); return !!(k.clientId && k.clientSecret); });

const PRODUCTION = "https://ecoproof.superbee.me";

function create() {
  return betterAuth({
    appName: "EcoProof AI",
    basePath: AUTH_BASE_PATH,
    secret: secret(),
    // The site answers on its own domain, Vercel previews and localhost: build links (e.g. Google's and Facebook's return address) from the host asked for.
    baseURL: {
      allowedHosts: ["ecoproof.superbee.me", "ecoproof-*-stylebar.vercel.app", "ecoproof-ai-*-stylebar.vercel.app", "localhost:*", "127.0.0.1:*"],
      fallback: process.env.APP_URL || PRODUCTION,
    },
    database: drizzleAdapter(orm(), {
      provider: "pg",
      schema: { user: authUser, session: authSession, account: authAccount, verification: authVerification },
    }),
    socialProviders: {
      ...(socialEnabled().includes("google") && { google: { ...(keys("google") as { clientId: string; clientSecret: string }), prompt: "select_account" as const } }),
      ...(socialEnabled().includes("facebook") && {
        facebook: {
          ...(keys("facebook") as { clientId: string; clientSecret: string }),
          // A Facebook account may have no email (signed up by phone); give it a placeholder rather than refuse the sign-in.
          mapProfileToUser: (profile) => (profile.email ? {} : { email: socialPlaceholderEmail("facebook", "sub" in profile ? profile.sub : profile.id) }),
        },
      }),
    },
    account: {
      // A wallet account has no real email, so adding Google or Facebook to it (or a wallet to them) must not require matching emails.
      // Facebook isn't trusted: its emails aren't verified, so a Facebook sign-in never joins an existing account just by matching email.
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
