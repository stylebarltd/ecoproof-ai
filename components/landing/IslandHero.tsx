import Image from "next/image";
import IslandParallax from "./IslandParallax";

/** Full-bleed island hero. Three layers from art/v2/island/<ver> (layers_sky.py, layers_cut.py, export_web.py):
 *  sky.webp (2048x1536, fills the section, the copy sits in it), main.webp (the island with the sky cut out) and fg.webp (the flower strip,
 *  bottom 15% of the plate, feathered top). On scroll the sky lags the page most, the island less, the flower strip runs ahead of it, the copy
 *  and the Bee Guardian move with the page (IslandParallax; data-drift = fraction of the viewport height over the first viewport of scroll).
 *  Below 1024px the 4:5 mobile crop replaces the island and strip and drifts like the island. */
/** The island version folder under public/landing/island. A new folder per plate busts the browser cache; next dev also caches optimized
 *  copies in .next/dev/cache/images (see CLAUDE.md). */
const DIR = "/landing/island/v4";

export default function IslandHero({ children }: { children: React.ReactNode }) {
  return (
    <section className="island-hero relative overflow-hidden">
      <IslandParallax />
      <div className="absolute inset-x-0 -top-[32vh] bottom-0 will-change-transform" data-drift="0.32">
        <Image src={`${DIR}/sky.webp`} alt="" fill priority sizes="100vw" className="object-cover object-bottom" />
      </div>
      <div className="relative z-10 px-4 pt-10 pb-8 sm:px-6 sm:pt-14 lg:pt-16 lg:pb-10">{children}</div>
      <div className="relative z-[5] -mt-[2vw] h-[clamp(360px,120vw,560px)] lg:-mt-[11vw] lg:h-[47vw]" role="img" aria-label="The EcoProof island: a beekeeper's hut in a flower meadow, a waterfall between two mesas, trees and distant hills at golden hour">
        <div className="absolute inset-x-0 top-0 will-change-transform" data-drift="0.16">
          <Image src={`${DIR}/main.webp`} alt="" width={2048} height={1024} priority sizes="100vw" className="hidden h-auto w-full lg:block" />
          <Image src={`${DIR}/mobile.webp`} alt="" width={1080} height={1350} priority sizes="100vw" className="h-auto w-full lg:hidden" />
        </div>
        <div className="absolute inset-x-0 top-0 hidden will-change-transform lg:block" data-drift="-0.06">
          <Image src={`${DIR}/fg.webp`} alt="" width={2048} height={1024} sizes="100vw" className="h-auto w-full" />
        </div>
        <Image src="/landing/bee.webp" alt="" width={944} height={880} sizes="(min-width: 1024px) 300px, 180px" className="bee-bob absolute -bottom-2 right-2 z-[6] h-[150px] w-auto lg:-right-10 lg:h-[300px]" style={{ filter: "drop-shadow(0 10px 18px rgba(58,42,28,0.3))" }} />
      </div>
    </section>
  );
}
