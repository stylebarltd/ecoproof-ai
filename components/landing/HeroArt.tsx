import Image from "next/image";
import { RANKS, type RankKey } from "@/lib/milestoneRules";

/** A round rubber-stamp mark drawn in SVG: two rings, condensed uppercase text on a circle, a glyph in the middle. Dusty sky blue, multiplied
 *  onto the paper. `text` is written around the ring; `glyph` sits in the centre. */
export function StampRing({ text, glyph, size = 150, rotate = 0, className = "" }: { text: string; glyph?: React.ReactNode; size?: number; rotate?: number; className?: string }) {
  const id = `ring-${text.replace(/[^a-z]/gi, "").toLowerCase()}`;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={`stamp-svg ${className}`} style={{ transform: `rotate(${rotate}deg)` }} aria-hidden>
      <defs><path id={id} d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" /></defs>
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2.5" />
      <text fontSize="11.5" letterSpacing="1.2" fill="currentColor" className="font-stamp uppercase"><textPath href={`#${id}`} startOffset="0">{text} · {text} ·</textPath></text>
      {glyph && <g transform="translate(50 50)">{glyph}</g>}
    </svg>
  );
}

/** Glyphs for the stamp centres, in the ring's coordinate space (about 28 units across). */
export const GLYPHS = {
  leaf: <path d="M-9,9 C-9,-4 1,-11 11,-11 C11,1 4,10 -9,9 Z M-9,9 L4,-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  star: <path d="M0,-11 L3.2,-3.6 11,-3.2 4.8,2 6.8,10 0,5.6 -6.8,10 -4.8,2 -11,-3.2 -3.2,-3.6 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  link: <path d="M-3,3 a5,5 0 0 1 0,-7 l4,-4 a5,5 0 0 1 7,7 l-2,2 M3,-3 a5,5 0 0 1 0,7 l-4,4 a5,5 0 0 1 -7,-7 l2,-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  check: <path d="M-10,1 L-3,8 L11,-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />,
} as const;

/** The hero's right half: the five rank cards fanned like a hand of playing cards around a shared bottom-centre pivot (Paragon on top), the
 *  Bee Guardian peeking in bottom-right with a thumbs up, and a few stamp marks scattered on the kraft paper behind. Hover opens the fan wide enough to
 *  show the cards behind (CSS only); the bee bobs; both stop under prefers-reduced-motion. Cards are 300x420 from 1024px, 200x280 below with the rotations halved. */
export default function HeroArt() {
  // Rotation and stacking per rank: Paragon centre and on top, Sentinel and Warden outermost.
  const fan: Record<RankKey, { r: number; z: number }> = { sentinel: { r: -14, z: 1 }, guardian: { r: -7, z: 3 }, paragon: { r: 0, z: 5 }, vanguard: { r: 7, z: 4 }, warden: { r: 14, z: 2 } };
  const scatter = [
    { text: "Verified eco impact", glyph: GLYPHS.check, size: 150, rotate: -12, className: "left-[2%] top-[4%] opacity-40 lg:left-[4%] lg:top-[2%]" },
    { text: "One scan one stamp", glyph: GLYPHS.star, size: 120, rotate: 18, className: "right-[4%] top-[10%] opacity-30 lg:right-[10%] lg:top-[0%]" },
    { text: "Anchored on Solana", glyph: GLYPHS.link, size: 170, rotate: -28, className: "left-[26%] top-[30%] opacity-25 lg:left-[22%] lg:top-[34%]" },
    { text: "Chiang Mai 2026", glyph: GLYPHS.leaf, size: 110, rotate: 9, className: "right-[18%] top-[50%] opacity-35 lg:right-[20%] lg:top-[56%]" },
  ];
  return (
    <div className="hero-art relative mx-auto h-[330px] w-full max-w-[560px] lg:h-[500px]" aria-label="The five Bee Guardian rank cards, fanned out, and the Bee Guardian giving a thumbs up" role="img">
      {scatter.map((s) => <StampRing key={s.text} text={s.text} glyph={s.glyph} size={s.size} rotate={s.rotate} className={`absolute text-sky ${s.className}`} />)}
      <div className="fan absolute bottom-[26px] left-1/2 h-[280px] w-[200px] -translate-x-1/2 lg:bottom-[40px] lg:h-[420px] lg:w-[300px]">
        {RANKS.map((rank) => (
          <div key={rank.key} className="fan-card absolute inset-0 origin-bottom" style={{ "--r": `${fan[rank.key].r}deg`, "--ro": `${fan[rank.key].r * 2.2}deg`, zIndex: fan[rank.key].z } as React.CSSProperties}>
            <Image src={`/landing/cards/${rank.key}.webp`} alt={`${rank.name} rank card`} width={600} height={840} priority={rank.key === "paragon"} sizes="(min-width: 1024px) 300px, 200px" className="h-full w-full rounded-[12px] shadow-[0_18px_40px_rgba(58,42,28,0.28)] lg:rounded-[16px]" />
          </div>
        ))}
      </div>
      <Image src="/landing/bee.webp" alt="" width={944} height={880} priority sizes="(min-width: 1024px) 472px, 236px" className="bee-bob absolute -bottom-3 -right-3 z-[6] h-[190px] w-auto lg:-bottom-6 lg:-right-16 lg:h-[340px]" style={{ filter: "drop-shadow(0 10px 18px rgba(58,42,28,0.3))" }} />
    </div>
  );
}
