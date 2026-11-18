/** The landing's hero: the copy and, beside it, the map of eco places with the phone that has just scanned one pin's QR code
 *  (components/landing/MapPicture.tsx), on kraft paper. Pola, 2026-11-18, after a day of hero photos that did not work (a guest in a
 *  hotel room, art/hero-room; a hotel desk with the postcard, art/hero-scan; before those the island artwork,
 *  public/landing/island/v4): no photo, the files and recipes stay in the repo. */
export default function IslandHero({ children }: { children: React.ReactNode }) {
  return (
    <section className="vignette grain relative overflow-hidden bg-kraft/60">
      <div className="relative z-10 px-4 pt-12 pb-20 sm:px-6 sm:pt-16 lg:pt-20 lg:pb-28">{children}</div>
    </section>
  );
}
