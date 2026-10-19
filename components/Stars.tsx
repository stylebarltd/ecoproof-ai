import { Star } from "lucide-react";

/** A place's stars: five, filled up to `stars`. Zero stars reads "Listed" (the bottom of the scale in data/practices.json). */
export default function Stars({ stars, label, size = 16, showLabel = false, className = "" }: { stars: number; label?: string; size?: number; showLabel?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} role="img" aria-label={stars ? `${stars} out of 5 eco stars` : label ?? "Listed"}>
      <span className="inline-flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={size} strokeWidth={2} className={i <= stars ? "fill-honey-500 text-honey-500" : "fill-transparent text-sage-900/25"} />
        ))}
      </span>
      {showLabel && <span className="text-[12px] font-bold text-sage-900" aria-hidden>{stars ? `${stars}/5` : label ?? "Listed"}</span>}
    </span>
  );
}
