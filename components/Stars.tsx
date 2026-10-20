import { Star } from "lucide-react";

/** A place's stars: five, filled up to `stars`, with a half-filled one for half stars (4.5). Zero stars reads "Listed" (the bottom of
 *  the scale in data/practices.json). */
export default function Stars({ stars, label, size = 16, showLabel = false, className = "" }: { stars: number; label?: string; size?: number; showLabel?: boolean; className?: string }) {
  const empty = "fill-transparent text-sage-900/25";
  const full = "fill-honey-500 text-honey-500";
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} role="img" aria-label={stars ? `${stars} out of 5 eco stars` : label ?? "Listed"}>
      <span className="inline-flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => i <= stars ? <Star key={i} size={size} strokeWidth={2} className={full} />
          : i - 0.5 <= stars ? (
            <span key={i} className="relative inline-flex">
              <Star size={size} strokeWidth={2} className={empty} />
              <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden"><Star size={size} strokeWidth={2} className={full} /></span>
            </span>
          ) : <Star key={i} size={size} strokeWidth={2} className={empty} />)}
      </span>
      {showLabel && <span className="text-[12px] font-bold text-sage-900" aria-hidden>{stars ? `${stars}/5` : label ?? "Listed"}</span>}
    </span>
  );
}
