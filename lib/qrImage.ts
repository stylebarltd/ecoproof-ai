import QRCode from "qrcode";

/** A claim link as a QR for print (an inline SVG image, in the postcard's ink). Server side: components/Postcard.tsx stays free of the
 *  QR library, so the browser can show a postcard too. */
export async function qrImage(url: string): Promise<string> {
  const svg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "Q", color: { dark: "#3a2a1c", light: "#ffffff" } });
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
