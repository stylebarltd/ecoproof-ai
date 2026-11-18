import { createHash, randomBytes } from "crypto";
import { query } from "./db";
import { ClusterMismatch, connectUrl, newState, otherCluster, readConnect, readSignature, signUrl, type DlProvider, type DlState } from "./walletDeeplink";
import { checkSignIn, signInMessage } from "./signin";

// Server-mediated wallet deep-link sign-in, so it works when the person starts in the installed app (PWA) and the wallet sends
// them back to a normal browser tab (separate storage on iPhones, and not always captured on Android).
//   start  (installed app): server makes the ephemeral keys, returns the wallet link; the app keeps a private `claim` secret
//   step   (wherever the wallet lands): handles `connect`, then `signMessage`; the server verifies the signature
//   poll   (installed app): hands the session to whoever holds the `claim`, once
// The keys only encrypt the wallet's replies and live a few minutes.

const MAX_AGE = "15 minutes";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const safePath = (p: string) => (/^\/(?!\/)[\w\-./?=&%]*$/.test(p) ? p : "/");
const redirectFor = (origin: string, sid: string) => `${origin}/wallet/callback?sid=${sid}`;

type Row = { sid: string; claim_hash: string; state: string; return_to: string; status: string; address: string | null; consumed_at: string | null };
const load = async (sid: string) => (await query<Row>(`SELECT * FROM auth_dl WHERE sid=$1 AND created_at > now() - interval '${MAX_AGE}'`, [sid]))[0] ?? null;
const save = (sid: string, s: DlState) => query("UPDATE auth_dl SET state=$2 WHERE sid=$1", [sid, JSON.stringify(s)]);

export async function startLogin(provider: DlProvider, claim: string, returnTo: string, origin: string): Promise<{ sid: string; url: string }> {
  await query("DELETE FROM auth_dl WHERE created_at < now() - interval '1 day'");
  const sid = randomBytes(16).toString("base64url");
  const state = newState(provider, "/");
  await query("INSERT INTO auth_dl (sid, claim_hash, state, return_to) VALUES ($1,$2,$3,$4)", [sid, sha(claim), JSON.stringify(state), safePath(returnTo)]);
  return { sid, url: connectUrl(state, origin, redirectFor(origin, sid)) };
}

export type StepResult = { next?: string; done?: { address: string; returnTo: string }; fresh?: boolean; error?: string }; // fresh: this very call completed the sign-in

/** The wallet's answer arrived (query parameters of the callback). */
export async function stepLogin(sid: string, params: URLSearchParams, ctx: { host: string; origin: string }): Promise<StepResult> {
  const row = await load(sid);
  if (!row) return { error: "This sign-in has expired. Please start again from EcoProof." };
  if (row.status === "done") return { done: { address: row.address!, returnTo: row.return_to } }; // a reloaded page: report it, but never hand out a session again
  const st = JSON.parse(row.state) as DlState;
  try {
    if (st.step === "connect") {
      const next = readConnect(st, params);
      const message = signInMessage(ctx.host, ctx.origin, next.address!);
      const s2: DlState = { ...next, step: "sign", message };
      await save(sid, s2);
      return { next: signUrl(s2, message, redirectFor(ctx.origin, sid)) };
    }
    const sig = readSignature(st, params);
    const why = await checkSignIn(ctx.host, st.address!, st.message!, Buffer.from(sig).toString("base64"));
    if (why) return { error: `Sign-in failed: ${why}` };
    await query("UPDATE auth_dl SET status='done', address=$2 WHERE sid=$1", [sid, st.address]);
    return { done: { address: st.address!, returnTo: row.return_to }, fresh: true };
  } catch (e) {
    if (e instanceof ClusterMismatch) { // the wallet is on the other network: retry once with it
      const retry = otherCluster(st);
      if (retry) { await save(sid, retry); return { next: connectUrl(retry, ctx.origin, redirectFor(ctx.origin, sid)) }; }
      return { error: "Your wallet is set to a different network than we asked for. In the wallet, switch to Mainnet (or Devnet) and try again." };
    }
    return { error: e instanceof Error ? e.message : "Sign-in failed." };
  }
}

/** The installed app asks whether its sign-in finished. Only the holder of the `claim` secret gets the session, once. */
export async function pollLogin(sid: string, claim: string): Promise<{ pending: true } | { expired: true } | { address: string; returnTo: string }> {
  const row = await load(sid);
  if (!row || row.claim_hash !== sha(claim)) return { expired: true };
  if (row.status !== "done" || !row.address) return { pending: true };
  const taken = await query("UPDATE auth_dl SET consumed_at=now() WHERE sid=$1 AND consumed_at IS NULL RETURNING sid", [sid]);
  if (!taken.length) return { expired: true };
  return { address: row.address, returnTo: row.return_to };
}
