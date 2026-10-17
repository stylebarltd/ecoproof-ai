import { after } from "next/server";
import { identityGroup } from "@/lib/users";
import { looksLikeWallet } from "@/lib/ids";
import { listNfts, mintPending } from "@/lib/milestones";
import { nftConfig } from "@/lib/nft";
import { rateLimited } from "@/lib/ratelimit";
import { getSession } from "@/lib/session";
import { addressUrl } from "@/lib/solana";

/** The Bee Guardians of the signed-in account, or of this device's guest passport (`userId`), with where they mint to. */
export async function GET(req: Request) {
  const s = await getSession(req);
  const userId = s ? s.key : new URL(req.url).searchParams.get("userId");
  if (!userId || userId.length > 64) return Response.json({ error: "userId required" }, { status: 400 });
  if (!s && looksLikeWallet(userId)) return Response.json({ error: "Sign in first" }, { status: 401 }); // a wallet's collection is shown to its owner only
  const group = await identityGroup(userId);
  const cfg = nftConfig();
  return Response.json({
    signedIn: !!s,
    wallet: looksLikeWallet(group[0]) ? group[0] : null,
    minting: !!cfg,
    collectionUrl: cfg ? addressUrl(cfg.collection) : null,
    nfts: (await listNfts(userId)).map((n) => ({ ...n, imageUrl: `/api/nft/${n.id}/image`, metadataUrl: `/api/nft/${n.id}/metadata` })),
  }, { headers: { "Cache-Control": "no-store" } });
}

/** "Claim now" / "Try again": mint everything waiting to the account's wallet. Runs after the response; the page polls GET. */
export async function POST(req: Request) {
  const s = await getSession(req);
  if (!s) return Response.json({ error: "Sign in first" }, { status: 401 });
  if (!s.wallet) return Response.json({ error: "Connect a wallet first: that's where your Bee Guardians go." }, { status: 409 });
  if (!nftConfig()) return Response.json({ error: "Minting isn't set up on this server yet." }, { status: 503 });
  if (rateLimited(`nft-claim:${s.key}`, 20)) return Response.json({ error: "Too many tries. Give it a few minutes." }, { status: 429 });
  after(() => mintPending(s.key).then(() => {}, (e) => console.error("nft claim failed", e)));
  return Response.json({ started: true }, { status: 202 });
}
