import Image from "next/image";

/** The landing's hero: the copy centred on kraft paper, with the Bee Guardian peeking in at the bottom right. The island artwork that
 *  used to fill it (sky and island plates from art/v2/island, public/landing/island/v4) was taken out on 2026-11-18 (Pola: a colour
 *  instead of the two background pictures); the files stay in the repo. */
export default function IslandHero({ children }: { children: React.ReactNode }) {
  return (
    <section className="vignette grain relative overflow-hidden bg-kraft/60">
      <div className="relative z-10 px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:pt-20 lg:pb-24">{children}</div>
      <Image src="/landing/bee.webp" alt="" width={944} height={880} priority sizes="(min-width: 1024px) 220px, 120px" className="bee-bob absolute -bottom-3 right-2 z-[5] hidden h-[120px] w-auto sm:block lg:right-10 lg:h-[220px]" style={{ filter: "drop-shadow(0 10px 18px rgba(58,42,28,0.3))" }} />
    </section>
  );
}
