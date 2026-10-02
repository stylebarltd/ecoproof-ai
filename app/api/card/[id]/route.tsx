import { ImageResponse } from "next/og";
import { query, type RecordRow } from "@/lib/db";
import { CHECK_PATH, CREAM, LEAF_PATH, SAGE, SAGE_LIGHT } from "@/lib/brand";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const square = new URL(req.url).searchParams.get("format") === "square";
  const r = (await query<RecordRow>("SELECT * FROM records WHERE id=$1", [id]))[0];
  if (!r) return new Response("not found", { status: 404 });
  const stat = (v: string, l: string) => (
    <div style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", background: "#065f46", borderRadius: 24, padding: "28px 16px" }}>
      <div style={{ fontSize: 64, fontWeight: 700 }}>{v}</div>
      <div style={{ fontSize: 26, color: "#6ee7b7" }}>{l}</div>
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 24, background: "linear-gradient(135deg,#052e22,#16a34a)", color: "white", padding: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 76, height: 76, borderRadius: 19, background: SAGE }}>
            <svg width="52" height="52" viewBox="0 0 48 48" fill="none" stroke={CREAM} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
              <path d={LEAF_PATH} />
              <path d={CHECK_PATH} />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>EcoProof<span style={{ color: SAGE_LIGHT, marginLeft: 12 }}>AI</span></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 54, fontWeight: 700 }}>My verified impact</div>
          <div style={{ fontSize: 28, color: "#a7f3d0" }}>{r.merchant}</div>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {stat(`${r.co2_kg}kg`, "CO₂ saved")}
          {stat(String(r.plastic_items), "plastic avoided")}
          {stat(`${r.packaging_g}g`, "packaging cut")}
        </div>
        <div style={{ display: "flex", alignItems: "center", alignSelf: "flex-start", fontSize: 30, fontWeight: 700, color: "#14F195", background: "rgba(0,0,0,0.35)", border: "2px solid #9945FF", borderRadius: 999, padding: "12px 28px" }}>{r.signature ? "Verified on Solana" : "Pending on-chain proof"}</div>
      </div>
    ),
    { width: 1080, height: square ? 1080 : 566 },
  );
}
