import QRCode from "qrcode";
import { getPlace } from "@/lib/stampPlaces";
import { orderUrl, verifyToken } from "@/lib/woo";

/** PNG QR of a signed order link, for the order email (<img> in HTML email). Only links with a valid signature get one. */
export async function GET(_req: Request, { params }: { params: Promise<{ place: string; token: string }> }) {
  const { place: placeId, token } = await params;
  const place = await getPlace(placeId);
  const orderId = place ? verifyToken(place.secret, placeId, token) : null;
  if (!place || !orderId) return new Response("not found", { status: 404 });
  const png = await QRCode.toBuffer(orderUrl(place.secret, placeId, orderId), { type: "png", margin: 2, width: 320, errorCorrectionLevel: "M", color: { dark: "#272e1b", light: "#ffffff" } });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" } });
}
