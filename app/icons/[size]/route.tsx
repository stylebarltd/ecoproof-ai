import { ImageResponse } from "next/og";

// PNG app icons for the PWA manifest and iOS home screen: /icons/192, /icons/512, /icons/180
export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const n = Math.min(1024, Math.max(48, parseInt((await params).size, 10) || 192));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#16a34a" }}>
        <div style={{ display: "flex", fontSize: n * 0.55 }}>🌱</div>
      </div>
    ),
    { width: n, height: n },
  );
}
