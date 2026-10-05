import { ImageResponse } from "next/og";
import { query, type RecordRow } from "@/lib/db";
import { getPlace, stampSvg } from "@/lib/stampPlaces";
import { CHECK_PATH, CREAM, INK, LEAF_PATH, SAGE, TERRA_LIGHT } from "@/lib/brand";
import { listNfts } from "@/lib/milestones";
import { rankNfts } from "@/lib/passportView";
import { RANKS, tierFor } from "@/lib/milestoneRules";
import { BeeCardOg, rankArt } from "@/lib/beeCardOg";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const square = new URL(req.url).searchParams.get("format") === "square";
  const r = (await query<RecordRow>("SELECT * FROM records WHERE id=$1", [id]))[0];
  if (!r) return new Response("not found", { status: 404 });
  const place = r.place_id ? await getPlace(r.place_id) : null;
  const stampImg = place ? `data:image/svg+xml;base64,${Buffer.from(stampSvg(place, { labels: false })).toString("base64")}` : null;
  const [top] = rankNfts(await listNfts(r.user_id)); // the owner's highest Bee Guardian, on the same card frame as the passport
  const rank = top ? tierFor(top.milestone) : RANKS[0];
  const bee = <BeeCardOg rank={rank} art={await rankArt(rank.key, req.url)} size={square ? 330 : 250} serial={top?.serial} edition={top?.edition} locked={!top} />;
  const stat = (v: string, l: string) => (
    <div style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", background: CREAM, borderRadius: 28, padding: "28px 16px" }}>
      <div style={{ fontSize: 64, fontWeight: 700, color: INK }}>{v}</div>
      <div style={{ fontSize: 26, color: "#645c50" }}>{l}</div>
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 24, border: r.source === "order" ? "12px solid #e8a317" : "0px solid transparent", background: "linear-gradient(160deg,#272e1b,#56633f 55%,#8fa073)", color: CREAM, padding: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 76, height: 76, borderRadius: 19, background: SAGE }}>
            <svg width="52" height="52" viewBox="0 0 48 48" fill="none" stroke={CREAM} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
              <path d={LEAF_PATH} />
              <path d={CHECK_PATH} />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>EcoProof<span style={{ color: TERRA_LIGHT, marginLeft: 12 }}>AI</span></div>
        </div>
        <div style={{ display: "flex", flexDirection: square ? "column-reverse" : "row", alignItems: square ? "flex-start" : "center", justifyContent: "space-between", gap: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 28, flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 54, fontWeight: 700 }}>{r.place_id ? "My eco passport" : "My verified impact"}</div>
              <div style={{ fontSize: 34, color: "#ccdbb2" }}>{`with ${r.merchant}`}</div>
            </div>
            {stampImg ? (
              <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={stampImg} width={190} height={190} alt="" />
                <div style={{ display: "flex", flexDirection: "column", fontSize: 34, color: CREAM }}>
                  <div style={{ fontSize: 46, fontWeight: 700 }}>{r.source === "order" ? "Verified purchase" : "Presence stamp · +1 point"}</div>
                  {r.source === "order" && r.impact_note ? <div style={{ color: "#ffd98a" }}>{r.impact_note}</div> : null}
                </div>
              </div>
            ) : (
            <div style={{ display: "flex", gap: 24 }}>
              {stat(String(r.plastic_items), "plastic avoided")}
              {stat(`${r.co2_kg}kg`, "CO₂ saved")}
              {stat(`${r.packaging_g}g`, "packaging cut")}
            </div>
            )}
          </div>
          {bee}
        </div>
        <div style={{ display: "flex", alignItems: "center", alignSelf: "flex-start", fontSize: 30, fontWeight: 700, color: INK, background: CREAM, border: "2px solid #9945FF", borderRadius: 999, padding: "12px 28px" }}>{r.signature ? "Verified on Solana" : "Pending on-chain proof"}</div>
      </div>
    ),
    { width: square ? 1080 : 1200, height: square ? 1080 : 630 },
  );
}
