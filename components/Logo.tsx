import { CHECK_PATH, CREAM, LEAF_PATH } from "@/lib/brand";

/** A leaf carrying a checkmark: the logo until 2026-11-20, now the Passport tab's symbol and the tile on printed cards. */
export function LeafMark({ size = 32, stroke = CREAM, strokeWidth = 2.75 }: { size?: number; stroke?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={LEAF_PATH} />
      <path d={CHECK_PATH} />
    </svg>
  );
}

/** The EcoProof logo: the passport stamp with the leaf checkmark (public/logo-mark.svg, written by art/logo/rings.py). No tile behind
 *  it: the stamp sits straight on the page, like ink on paper. The leaf above stays the Passport tab's symbol. */
export function LogoTile({ size = 36 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element -- a small static SVG; nothing to optimise
  return <img src="/logo-mark.svg" alt="" width={size} height={size} className="shrink-0" style={{ width: size, height: size, transform: "scale(1.2)" }} />;
}

export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <span className="font-heading leading-none text-ink" style={{ fontSize: size }}>
      EcoProof
    </span>
  );
}

export function LogoLockup({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoTile size={size} />
      <Wordmark size={size * 0.56} />
    </span>
  );
}
