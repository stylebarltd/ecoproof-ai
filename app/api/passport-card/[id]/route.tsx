import { ImageResponse } from "next/og";
import { getPassport } from "@/lib/passport";
import { resolvePublicId } from "@/lib/publicId";
import { BeeCardOg, CARD_INK, CARD_MUTED, CARD_PAPER, cardFonts, rankArt } from "@/lib/beeCardOg";
import { stampSvg } from "@/lib/stampPlaces";
import { RANKS, tierFor } from "@/lib/milestoneRules";
import { progress, rankNfts } from "@/lib/passportView";
import { query } from "@/lib/db";
import { appUrl } from "@/lib/nft";

const PAPER = "#F5EAD8", TERRA = "#B2622D", TERRA_SOFT = "#F6A06B";
const uri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/** Share image of a passport in the NFT card style: the top Bee Guardian card, points, progress and the stamp collection on paper.
 *  ?format=square (1080x1080, for posts) or wide (1200x630, link previews). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await resolvePublicId(decodeURIComponent((await params).id));
  if (!owner) return new Response("Not found", { status: 404 });
  const square = new URL(req.url).searchParams.get("format") === "square";
  const pass = await getPassport(owner);
  const stamps = pass.totals.receipts;
  const points = pass.points; // ranks are reached by points
  const [top] = rankNfts(pass.nfts);
  const tier = top ? tierFor(top.milestone) : null;
  const prog = progress(points, pass.nextMilestone);
  const placeRows = await query<{ id: string; name: string; kind: string; colour: string | null; image: string | null }>("SELECT id,name,kind,colour,image FROM stamp_places ORDER BY created_at, name");
  const earned = new Set(pass.places.filter((p) => p.earned).map((p) => p.id));
  const show = [...placeRows].sort((a, b) => Number(earned.has(b.id)) - Number(earned.has(a.id))).slice(0, square ? 8 : 6); // earned stamps first
  const rank = tier ?? RANKS[0]; // no NFT yet: the Sentinel, locked
  const [art, fonts] = await Promise.all([rankArt(rank.key), cardFonts()]);
  const host = new URL(appUrl()).host;
  const shownHost = host.endsWith(".vercel.app") && host.includes("ecoproof") ? "ecoproof-ai.vercel.app" : host;
  const W = square ? 1080 : 1200, H = square ? 1080 : 630;
  const cardSize = square ? 400 : 290;
  const stampSize = square ? 96 : 70;

  const stampsRow = (
    <div style={{ display: "flex", gap: square ? 18 : 12, flexWrap: "wrap" }}>
      {show.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={p.id} src={uri(stampSvg(p, { labels: false }))} width={stampSize} height={stampSize} alt="" style={{ borderRadius: 999, opacity: earned.has(p.id) ? 1 : 0.3, border: earned.has(p.id) ? `3px solid ${CARD_INK}` : `3px dashed ${CARD_MUTED}` }} />
      ))}
    </div>
  );
  const numbers = (
    <div style={{ display: "flex", flexDirection: "column", gap: square ? 14 : 10, width: square ? 520 : 760 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <div style={{ display: "flex", fontFamily: "Caprasimo", fontSize: square ? 150 : 110, color: CARD_INK, lineHeight: 1 }}>{points}</div>
        <div style={{ display: "flex", fontFamily: "Caprasimo", fontSize: square ? 48 : 38, color: TERRA }}>{points === 1 ? "point" : "points"}</div>
      </div>
      <div style={{ display: "flex", fontWeight: 700, fontSize: square ? 38 : 30, color: CARD_INK }}>{tier ? `${tier.name} Bee Guardian` : "Collecting my first stamp"}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
        <div style={{ display: "flex", fontSize: square ? 25 : 23, lineHeight: 1.3, color: CARD_MUTED }}>{`${prog.text} · ${stamps} stamp${stamps === 1 ? "" : "s"}${pass.stampsByClass.verified ? `, ${pass.stampsByClass.verified} verified purchase${pass.stampsByClass.verified === 1 ? "" : "s"}` : ""}`}</div>
        <div style={{ display: "flex", width: square ? 520 : 460, height: 20, flexShrink: 0, borderRadius: 999, border: `3px solid ${CARD_INK}`, background: CARD_PAPER, padding: 2 }}>
          <div style={{ display: "flex", width: `${Math.max(4, Math.round(prog.fraction * 100))}%`, height: 10, borderRadius: 999, background: `linear-gradient(90deg,${TERRA_SOFT},${TERRA})` }} />
        </div>
      </div>
    </div>
  );
  const card = <BeeCardOg rank={rank} art={art} size={cardSize} serial={top?.serial} edition={top?.edition} locked={!top} minted={top?.status === "minted"} impact={{ plasticItems: pass.totals.plasticItems, co2Kg: pass.totals.co2Kg, stamps }} />;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: square ? 56 : 44, fontFamily: "Figtree", color: CARD_INK, background: `radial-gradient(circle at 85% 10%, rgba(246,160,107,0.28), rgba(246,160,107,0) 50%), radial-gradient(circle at 10% 95%, rgba(178,98,45,0.14), rgba(178,98,45,0) 45%), ${PAPER}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", fontFamily: "Caprasimo", fontSize: square ? 46 : 40 }}>EcoProof<span style={{ color: TERRA, marginLeft: 12 }}>AI</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: square ? 25 : 22, color: CARD_INK, background: CARD_PAPER, border: `3px solid ${CARD_INK}`, borderRadius: 999, padding: "8px 22px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={TERRA} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 7" /></svg>
            Verified on Solana
          </div>
        </div>

        {square ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
              {card}
              {numbers}
            </div>
            {stampsRow}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
            {card}
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>{numbers}{stampsRow}</div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, fontSize: square ? 25 : 21, color: CARD_MUTED }}>
          <div>My eco passport · every stamp anchored on Solana</div>
          <div style={{ display: "flex", flexShrink: 0 }}>{shownHost}</div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts },
  );
}
