import Image from "next/image";

/** Full-bleed island hero, static. Two images from art/v2/island/<ver> (sky_static.py, layers_cut.py, export_web.py): sky.webp (2048x1536,
 *  the plate's own sky with 512 px of gradient above it) fills the section and the copy sits in it; main.webp (the island with the sky cut out)
 *  shows as a band under the copy: from the mesa tops to the top of the waterfall, so the hero ends near the fold and the next section peeks in
 *  (the critique of 14 Nov 2026 found the full island took 1.5 desktop screens before any product). Below 1024px the 4:5 mobile crop replaces
 *  it, cut the same way. The band fades into the paper below it. The Bee Guardian peeks in bottom-right. */
/** The island version folder under public/landing/island. A new folder per plate busts the browser cache; next dev also caches optimized
 *  copies in .next/dev/cache/images (see CLAUDE.md). */
const DIR = "/landing/island/v4";

export default function IslandHero({ children }: { children: React.ReactNode }) {
  return (
    <section className="island-hero relative overflow-hidden">
      <Image src={`${DIR}/sky.webp`} alt="" fill priority sizes="100vw" className="object-cover object-bottom" />
      <div className="relative z-10 px-4 pt-10 pb-8 sm:px-6 sm:pt-14 lg:pt-16 lg:pb-10">{children}</div>
      <div className="relative z-[5] h-[clamp(190px,56vw,280px)] overflow-hidden lg:-mt-[3vw] lg:h-[19vw]" role="img" aria-label="The EcoProof island: two mesas over a flower meadow and the top of a waterfall, at golden hour">
        <Image src={`${DIR}/main.webp`} alt="" width={2048} height={1024} priority sizes="100vw" className="absolute inset-x-0 -top-[5vw] hidden h-auto w-full lg:block" />
        <Image src={`${DIR}/mobile.webp`} alt="" width={1080} height={1350} priority sizes="100vw" className="absolute inset-x-0 -top-[17vw] h-auto w-full lg:hidden" />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-paper lg:h-20" aria-hidden />
      </div>
      <Image src="/landing/bee.webp" alt="" width={944} height={880} sizes="(min-width: 1024px) 220px, 130px" className="bee-bob absolute bottom-1 right-2 z-[6] h-[110px] w-auto lg:right-6 lg:h-[200px]" style={{ filter: "drop-shadow(0 10px 18px rgba(58,42,28,0.3))" }} />
    </section>
  );
}
