import Image from "next/image";

/** The landing's hero: the copy on kraft paper, and a photo of a guest in an eco hotel room in late-afternoon light with the hotel's
 *  A6 postcard on a wooden table beside a jar of tea and a refill bottle (Pola, 2026-11-18: warm, comfy, clean, so the viewer trusts EcoProof and feels a good green choice;
 *  recipe in art/hero-room). On wide screens the photo fills the right side and fades into the paper under the copy; on phones it
 *  sits above the copy. The fades are `.hero-photo` in app/globals.css. The island artwork (public/landing/island/v4) and the
 *  plain-colour hero with the map before it were replaced the same day; the island files stay in the repo. */
export default function IslandHero({ children }: { children: React.ReactNode }) {
  return (
    <section className="grain relative overflow-hidden bg-kraft/60">
      <Image src="/landing/hero/room-table.webp" width={2432} height={1664} priority sizes="(min-width: 1024px) 58vw, 100vw"
        alt="A hotel guest sits by the window with a cup of tea in warm evening light. On the wooden table in front of her, next to a jar of tea and a refill bottle, stands the hotel's EcoProof postcard: Collect an eco stamp for your stay, with a QR code"
        className="hero-photo block aspect-[3/2] w-full object-cover object-left lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:h-full lg:w-[58%]" />
      <div className="relative z-10 px-4 pt-6 pb-14 sm:px-6 lg:pt-20 lg:pb-24">{children}</div>
    </section>
  );
}
