import { ImageResponse } from "next/og";
import { getPassport } from "@/lib/passport";
import { artSvg } from "@/lib/nftArt";
import { stampSvg } from "@/lib/stampPlaces";
import { tierFor } from "@/lib/nft";
import { progress, rankNfts } from "@/lib/passportView";
import { query } from "@/lib/db";
import { appUrl } from "@/lib/nft";
import { CHECK_PATH, CREAM, INK, LEAF_PATH, SAGE } from "@/lib/brand";

const HONEY = "#e8a317", HONEY_L = "#f7d27a";
const uri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/** Share image of a passport: top NFT, tier, stamp collection and numbers. ?format=square (1080x1080) or wide (1200x630, link previews). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const square = new URL(req.url).searchParams.get("format") === "square";
  const pass = await getPassport(id);
  const stamps = pass.totals.receipts;
  const [top] = rankNfts(pass.nfts);
  const tier = top ? tierFor(top.milestone) : null;
  const prog = progress(stamps, pass.nextMilestone);
  const placeRows = await query<{ id: string; name: string; kind: string; colour: string | null; image: string | null }>("SELECT id,name,kind,colour,image FROM stamp_places ORDER BY created_at, name");
  const earned = new Set(pass.places.filter((p) => p.earned).map((p) => p.id));
  const show = [...placeRows].sort((a, b) => Number(earned.has(b.id)) - Number(earned.has(a.id))).slice(0, square ? 8 : 6); // earned stamps first
  const artMilestone = top?.milestone ?? 1;
  const art = uri(artSvg({ milestone: artMilestone, proofs: stamps, plasticItems: 0, co2Kg: 0, brand: "" }, { labels: false })); // text is drawn below: the SVG rasteriser has no fonts on Vercel
  const legend = tier?.key === "legend";
  const host = new URL(appUrl()).host;
  const shownHost = host.endsWith(".vercel.app") && host.includes("ecoproof") ? "ecoproof-ai.vercel.app" : host;
  const W = square ? 1080 : 1200, H = square ? 1080 : 630;
  const artSize = square ? 400 : 360;
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
        <div style={{ display: "flex",  fontSize: square ? 120 : 110, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{stamps}</div>
        <div style={{ display: "flex",  fontSize: square ? 46 : 36, fontWeight: 700, color: HONEY_L }}>{stamps === 1 ? "stamp" : "stamps"}</div>
      </div>
      <div style={{ display: "flex",  fontSize: square ? 40 : 32, fontWeight: 700, color: CREAM }}>{tier ? `Eco ${tier.name}` : "Collecting my first stamp"}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: square ? "center" : "flex-start", gap: 8, marginTop: 4 }}>
        <div style={{ display: "flex",  fontSize: square ? 28 : 24, color: "#dcebc4" }}>{prog.text}</div>
        <div style={{ display: "flex", width: square ? 480 : 420, height: 18, borderRadius: 999, background: "rgba(255,255,255,0.28)" }}>
          <div style={{ display: "flex", width: `${Math.max(5, Math.round(prog.fraction * 100))}%`, height: 18, borderRadius: 999, background: `linear-gradient(90deg,${HONEY_L},${HONEY})` }} />
        </div>
      </div>
    </div>
  );

  const k = artSize / 512;
  const txt = { display: "flex", position: "absolute", alignItems: "center", justifyContent: "center", fontWeight: 800 } as const;
  const artTile = (
    <div style={{ display: "flex", padding: 6, borderRadius: square ? 54 : 46, background: "rgba(255,255,255,0.9)" }}>
      <div style={{ display: "flex", position: "relative", width: artSize, height: artSize, borderRadius: square ? 48 : 40, overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={art} width={artSize} height={artSize} alt="" />
        <div style={{ ...txt, left: 86 * k, top: 452 * k, width: 340 * k, height: 42 * k, fontSize: 22 * k, color: legend ? HONEY_L : "#272e1b" }}>{`${tier?.name ?? "Seedling"} · ${artMilestone === 1 ? "First stamp" : `${artMilestone} stamps`}`}</div>
        {artMilestone >= 50 ? <div style={{ ...txt, left: 56 * k, top: 68 * k, width: 72 * k, height: 72 * k, fontSize: (artMilestone >= 100 ? 24 : 28) * k, color: HONEY_L, fontWeight: 900 }}>{String(artMilestone)}</div> : null}
      </div>
    </div>
  );

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
