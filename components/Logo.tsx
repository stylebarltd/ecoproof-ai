import { CHECK_PATH, CREAM, LEAF_PATH, SAGE, SAGE_LIGHT } from "@/lib/brand";

/** The EcoProof mark: a leaf carrying a checkmark (sustainable choice, verified). */
export function LeafMark({ size = 32, stroke = CREAM }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={stroke} strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={LEAF_PATH} />
      <path d={CHECK_PATH} />
    </svg>
  );
}

/** Mark on its sage tile (app icon style). */
export function LogoTile({ size = 40 }: { size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size, borderRadius: size * 0.25, background: SAGE }}>
      <LeafMark size={size * 0.68} />
    </span>
  );
}

export function Wordmark({ size = 24 }: { size?: number }) {
  return (
    <span className="font-bold leading-none" style={{ fontSize: size }}>
      EcoProof<span style={{ color: SAGE_LIGHT }}> AI</span>
    </span>
  );
}

export function LogoLockup({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoTile size={size} />
      <Wordmark size={size * 0.62} />
    </span>
  );
}
