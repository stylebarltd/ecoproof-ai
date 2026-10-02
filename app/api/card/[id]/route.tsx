import { ImageResponse } from "next/og";
import { query, type RecordRow } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = (await query<RecordRow>("SELECT * FROM records WHERE id=$1", [id]))[0];
  if (!r) return new Response("not found", { status: 404 });
  const stat = (v: string, l: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#065f46", borderRadius: 24, padding: "24px 32px" }}>
      <div style={{ fontSize: 64, fontWeight: 700 }}>{v}</div>
      <div style={{ fontSize: 26, color: "#6ee7b7" }}>{l}</div>
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(135deg,#052e22,#16a34a)", color: "white", padding: 56 }}>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>🌱 EcoProof AI</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 54, fontWeight: 700 }}>My verified impact</div>
          <div style={{ fontSize: 28, color: "#a7f3d0" }}>{r.merchant}</div>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {stat(`${r.co2_kg}kg`, "CO₂ saved")}
          {stat(String(r.plastic_items), "plastic avoided")}
          {stat(`${r.packaging_g}g`, "packaging cut")}
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#d1fae5" }}>{r.signature ? "⛓️ Proof anchored on Solana" : "Pending on-chain proof"}</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
