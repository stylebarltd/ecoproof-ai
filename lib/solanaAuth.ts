import { createHash } from "crypto";
import * as z from "zod";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint, getSessionFromCtx } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { looksLikeWallet } from "./ids";

// Solana wallets as a Better Auth sign-in method. The wallet proves itself with our own Sign-In With Solana message
// (lib/siws.ts, lib/signin.ts: nonce, domain, expiry, single use); this plugin only runs after that check succeeded, so its one
// endpoint is server-only: it is never reachable over HTTP, only from our routes that verified the signature.

export const SOLANA_PROVIDER = "solana";

/** Better Auth wants a unique email per user. Wallet-only accounts get one that can never receive mail. */
const placeholderEmail = (address: string) => `wallet-${createHash("sha256").update(address).digest("hex").slice(0, 32)}@wallet.ecoproof.invalid`;
export const isPlaceholderEmail = (email: string) => email.endsWith("@wallet.ecoproof.invalid");

export const solanaWallet = () => ({
  id: "solana-wallet",
  endpoints: {
    /**
     * A verified wallet signs in. Signed in already (e.g. with Google): the wallet is added to that account instead.
     * A wallet that belongs to a different account is refused rather than silently switching accounts.
     */
    walletSession: createAuthEndpoint.serverOnly({ method: "POST", body: z.object({ address: z.string() }) }, async (ctx) => {
      const { address } = ctx.body;
      if (!looksLikeWallet(address)) throw new APIError("BAD_REQUEST", { message: "Invalid wallet address" });
      const current = await getSessionFromCtx(ctx).catch(() => null);
      const owned = await ctx.context.adapter.findOne<{ userId: string }>({
        model: "account",
        where: [{ field: "providerId", value: SOLANA_PROVIDER }, { field: "accountId", value: address }],
      });
      if (owned && current && owned.userId !== current.user.id) {
        throw new APIError("CONFLICT", { message: "This wallet already belongs to another EcoProof account. Sign out first to use it." });
      }
      let userId = owned?.userId ?? current?.user.id;
      if (!userId) {
        const user = await ctx.context.internalAdapter.createUser(
          { name: `${address.slice(0, 4)}…${address.slice(-4)}`, email: placeholderEmail(address), image: null },
          { method: SOLANA_PROVIDER },
        );
        userId = user.id;
      }
      if (!owned) await ctx.context.internalAdapter.createAccount({ userId, providerId: SOLANA_PROVIDER, accountId: address });
      if (current?.user.id === userId) return ctx.json({ userId, added: !owned }); // linked to the account they are signed in to
      const session = await ctx.context.internalAdapter.createSession(userId);
      const user = await ctx.context.internalAdapter.findUserById(userId);
      if (!session || !user) throw new APIError("INTERNAL_SERVER_ERROR", { message: "Could not start a session" });
      await setSessionCookie(ctx, { session, user });
      return ctx.json({ userId, added: !owned });
    }),
  },
}) satisfies BetterAuthPlugin;
