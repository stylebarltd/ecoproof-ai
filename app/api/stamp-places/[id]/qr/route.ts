import QRCode from "qrcode";
import { getPlace, toPublic } from "@/lib/stampPlaces";

/** The place's claim QR (SVG, print-ready). It encodes the same URL as the tap link. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const p = await getPlace((await params).id);
  if (!p) return new Response("not found", { status: 404 });
  const svg = await QRCode.toString(toPublic(p).claimUrl, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: { dark: "#272e1b", light: "#ffffff" } });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300" } });
}
