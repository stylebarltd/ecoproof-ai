import Image from "next/image";
import { Check } from "lucide-react";
import { POINTS_BY_KIND, pointsLabel } from "@/lib/stampClasses";

/** The landing's hero, "the scan moment" (Pola, 2026-11-18): the copy on kraft paper, and beside it a photo of an eco hotel's desk in
 *  golden evening light with the hotel's A6 postcard on it (recipe in art/hero-scan), and the phone that has just scanned it
 *  (HeroPhone, drawn here, not part of the photo). On wide screens the photo fills the right side and fades into the paper next to
 *  the copy; on phones it sits above the copy, without the phone. The fades are `.hero-photo` in app/globals.css. Earlier heroes the
 *  same day: a guest in a hotel room (art/hero-room, "doesn't work"), the map on plain kraft, the island artwork
 *  (public/landing/island/v4, files stay in the repo). */
export default function IslandHero({ children }: { children: React.ReactNode }) {
  return (
    <section className="grain relative overflow-hidden bg-kraft/60">
      <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-[58%]">
        <Image src="/landing/hero/desk-card.webp" width={2432} height={1664} priority sizes="(min-width: 1024px) 58vw, 100vw"
          alt="The wooden desk of an eco hotel in warm evening light, a plant and a sunny terrace behind it. On the desk stands the hotel's EcoProof postcard: Collect an eco stamp for your stay, with the hotel's eco stars and a QR code"
          className="hero-photo block aspect-[3/2] w-full object-cover object-[30%_50%] lg:aspect-auto lg:h-full" />
        <HeroPhone />
      </div>
      <div className="relative z-10 px-4 pt-6 pb-14 sm:px-6 lg:pt-20 lg:pb-24">{children}</div>
    </section>
  );
}

/** What the phone shows a few seconds after scanning the postcard: the stamp, its points and the proof. Points from lib/stampClasses.ts. */
function HeroPhone() {
  return (
    <div className="absolute right-[7%] top-1/2 hidden w-[236px] -translate-y-1/2 rotate-[4deg] rounded-[36px] border-[8px] border-cocoa bg-paper p-3 pb-4 text-cocoa shadow-[0_30px_60px_rgba(58,42,28,0.45)] lg:block xl:right-[10%]" role="img" aria-label={`A phone after scanning the postcard: stamp collected at Demo Riverside Resort, ${pointsLabel(POINTS_BY_KIND.hotel)}, proof written to Solana, Sentinel Bee Guardian unlocked`}>
      <div className="mx-auto mb-3 h-5 w-20 rounded-full bg-cocoa" />
      <div className="rounded-2xl bg-kraft/60 px-3 py-3 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#8fa073] text-paper"><Check size={26} strokeWidth={3} aria-hidden /></span>
        <p className="font-journal-display mt-2 text-[19px] font-bold leading-tight">Stamp collected</p>
        <p className="mt-0.5 text-[12.5px] font-bold text-cocoa/80">Demo Riverside Resort</p>
        <p className="mt-2 inline-block rounded-full bg-honey px-2.5 py-0.5 text-[12px] font-extrabold">+{pointsLabel(POINTS_BY_KIND.hotel)} · hotel stay</p>
      </div>
      <p className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-white/70 px-2.5 py-2 text-[11.5px] font-bold leading-snug"><Check size={14} strokeWidth={3} className="shrink-0 text-[#56633f]" aria-hidden /> Proof written to Solana. Nobody can fake it.</p>
      <div className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-white/70 px-2.5 py-2">
        <Image src="/landing/cards/sentinel.webp" alt="" width={600} height={840} sizes="44px" className="w-11 rounded-[5px] shadow-sm" />
        <p className="text-[11.5px] font-bold leading-snug">Bee Guardian unlocked<span className="block font-journal-display text-[15px] leading-tight">Sentinel</span></p>
      </div>
    </div>
  );
}
