import { ImageResponse } from "next/og";
import { CHECK_PATH, CREAM, LEAF_PATH, SAGE } from "@/lib/brand";

// PNG app icons for the PWA manifest and iOS home screen: /icons/192, /icons/512, /icons/180
export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const n = Math.min(1024, Math.max(48, parseInt((await params).size, 10) || 192));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: SAGE }}>
        <svg width={n * 0.72} height={n * 0.72} viewBox="0 0 48 48" fill="none" stroke={CREAM} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
          <path d={LEAF_PATH} />
          <path d={CHECK_PATH} />
        </svg>
      </div>
    ),
    { width: n, height: n },
  );
}
