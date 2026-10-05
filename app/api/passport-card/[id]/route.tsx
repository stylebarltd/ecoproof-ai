import { ImageResponse } from "next/og";
import { getPassport } from "@/lib/passport";
import { resolvePublicId } from "@/lib/publicId";
import { BeeCardOg, rankArt } from "@/lib/beeCardOg";
import { stampSvg } from "@/lib/stampPlaces";
import { RANKS, tierFor } from "@/lib/milestoneRules";
import { progress, rankNfts } from "@/lib/passportView";
import { query } from "@/lib/db";
import { appUrl } from "@/lib/nft";
import { CHECK_PATH, CREAM, INK, LEAF_PATH, SAGE } from "@/lib/brand";

const HONEY = "#e8a317", HONEY_L = "#f7d27a";
const uri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/** Share image of a passport: top NFT, tier, stamp collection and numbers. ?format=square (1080x1080) or wide (1200x630, link previews). */
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
  const art = await rankArt(rank.key, req.url);
  const host = new URL(appUrl()).host;
  const shownHost = host.endsWith(".vercel.app") && host.includes("ecoproof") ? "ecoproof-ai.vercel.app" : host;
  const W = square ? 1080 : 1200, H = square ? 1080 : 630;
  const artSize = square ? 340 : 300; // the card adds a header and footer around the artwork
  const stampSize = square ? 92 : 72;

  const stampsRow = (
    <div style={{ display: "flex", gap: square ? 18 : 14, flexWrap: "wrap" }}>
      {show.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={p.id} src={uri(stampSvg(p, { labels: false }))} width={stampSize} height={stampSize} alt="" style={{ borderRadius: 999, opacity: earned.has(p.id) ? 1 : 0.28, border: earned.has(p.id) ? "3px solid rgba(255,255,255,0.9)" : "3px dashed rgba(255,255,255,0.7)" }} />
      ))}
    </div>
  );
  const numbers = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: square ? "center" : "flex-start", gap: square ? 10 : 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <div style={{ display: "flex",  fontSize: square ? 120 : 110, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{points}</div>
        <div style={{ display: "flex",  fontSize: square ? 46 : 36, fontWeight: 700, color: HONEY_L }}>{points === 1 ? "point" : "points"}</div>
      </div>
      <div style={{ display: "flex",  fontSize: square ? 40 : 32, fontWeight: 700, color: CREAM }}>{tier ? `${tier.name} Bee Guardian` : "Collecting my first stamp"}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: square ? "center" : "flex-start", gap: 8, marginTop: 4 }}>
        <div style={{ display: "flex",  fontSize: square ? 28 : 24, color: "#dcebc4" }}>{`${prog.text} · ${stamps} stamp${stamps === 1 ? "" : "s"}${pass.stampsByClass.verified ? `, ${pass.stampsByClass.verified} verified purchase${pass.stampsByClass.verified === 1 ? "" : "s"}` : ""}`}</div>
        <div style={{ display: "flex", width: square ? 480 : 420, height: 18, borderRadius: 999, background: "rgba(255,255,255,0.28)" }}>
          <div style={{ display: "flex", width: `${Math.max(5, Math.round(prog.fraction * 100))}%`, height: 18, borderRadius: 999, background: `linear-gradient(90deg,${HONEY_L},${HONEY})` }} />
        </div>
      </div>
    </div>
  );

  const artTile = <BeeCardOg rank={rank} art={art} size={artSize} serial={top?.serial} edition={top?.edition} locked={!top} />;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: square ? 56 : 48, color: CREAM, background: `radial-gradient(circle at 12% 0%, rgba(247,210,122,0.85), rgba(247,210,122,0) 55%), linear-gradient(160deg,#3d472b,#56633f 50%,#8fa073)` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 16, background: SAGE }}>
              <svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke={CREAM} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"><path d={LEAF_PATH} /><path d={CHECK_PATH} /></svg>
            </div>
            <div style={{ display: "flex", fontSize: 38, fontWeight: 700 }}>EcoProof<span style={{ color: "#ffc6a5", marginLeft: 10 }}>AI</span></div>
          </div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: INK, background: CREAM, border: "2px solid #9945FF", borderRadius: 999, padding: "10px 24px" }}>Verified on Solana</div>
        </div>

        {square ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
            {artTile}
            {numbers}
            {stampsRow}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
            {artTile}
            <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>{numbers}{stampsRow}</div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, fontSize: square ? 26 : 22, color: "#dcebc4" }}>
          <div>My eco passport · every stamp anchored on Solana</div>
          <div style={{ display: "flex", flexShrink: 0 }}>{shownHost}</div>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}
