import { CHECK_PATH, CREAM, LEAF_PATH, SAGE, TERRA } from "@/lib/brand";

/** The EcoProof mark: a leaf carrying a checkmark (sustainable choice, verified). */
export function LeafMark({ size = 32, stroke = CREAM, strokeWidth = 2.75 }: { size?: number; stroke?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={LEAF_PATH} />
      <path d={CHECK_PATH} />
    </svg>
  );
}

/** Mark on its sage tile (app icon style). The mark is ~58% of the tile, as in the design sheet. */
export function LogoTile({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size, borderRadius: size * 0.28, background: SAGE }}>
      <LeafMark size={size * 0.62} />
    </span>
  );
}

export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <span className="font-heading leading-none text-ink" style={{ fontSize: size }}>
      EcoProof<span style={{ color: TERRA }}> AI</span>
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
