import { ImageResponse } from "next/og";
import { LOGO_MARK_SVG, LOGO_PAPER } from "@/lib/logoMark";

const MARK = `data:image/svg+xml;base64,${Buffer.from(LOGO_MARK_SVG).toString("base64")}`;

// PNG app icons for the PWA manifest and iOS home screen: /icons/192, /icons/512, /icons/180.
// The stamp logo on its paper colour, edge to edge: its outer ring stays inside the middle 80%, which is what a maskable icon may crop to.
export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const n = Math.min(1024, Math.max(48, parseInt((await params).size, 10) || 192));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: LOGO_PAPER }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={MARK} width={n} height={n} />
      </div>
    ),
    { width: n, height: n },
  );
}
