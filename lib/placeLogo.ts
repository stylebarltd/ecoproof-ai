// A place's logo and one-line tagline: what the owner gives when joining (app/api/places/join) and can change later
// (app/api/places/mine/[id]/profile). The logo is a small data URL, cropped and shrunk by the browser (lib/clientLogo.ts).

export const TAGLINE_MAX = 90;

/** Magic-byte check so only real PNG/JPEG/WebP images are stored (no SVG, no scripts). */
export function validLogo(dataUrl: string): boolean {
  const m = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!m || dataUrl.length > 220_000) return false;
  const b = Buffer.from(m[2].slice(0, 24), "base64");
  return (m[1] === "png" && b.subarray(0, 4).toString("hex") === "89504e47") || (m[1] === "jpeg" && b.subarray(0, 3).toString("hex") === "ffd8ff") || (m[1] === "webp" && b.subarray(0, 4).toString() === "RIFF");
}

export const cleanTagline = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ");
