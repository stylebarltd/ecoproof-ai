// Copy that changes without a redesign: the landing page's pricing and the example passport it links to.

/** Pricing cards. Only the founding offer has a price; the price after the first 50 is not decided yet (Nov 2026), so the page says how it
 *  will work instead of printing a number. Once it is decided, give the second card a `price` and `period` and it shows as a figure. */
export const PRICING: { name: string; price?: string; period?: string; note: string }[] = [
  { name: "Founding", price: "Free", note: "The first 50 businesses. Everything included, for as long as EcoProof exists. Founding businesses never pay." },
  { name: "After the first 50", note: "A simple yearly price per place. It will be shown here before anyone is asked to pay." },
];

/** The hero shows its stamp-tile counters (proofs, plastic, CO2) only from this many proofs on. Below it, small totals read as "nobody uses
 *  this" and one big order skews them (critique of 14 Nov 2026), so the hero says "early days" with the real counts instead. */
export const COUNTERS_FROM = 100;

/** The hero's secondary link: a real passport worth showing (LANDING_DEMO_PASSPORT); without one, the guide, and then it says so
 *  instead of promising a live passport (critique run 8). */
export const demoPassport = () => process.env.LANDING_DEMO_PASSPORT
  ? { href: `/u/${process.env.LANDING_DEMO_PASSPORT}`, label: "See a live passport" }
  : { href: "/about#customers", label: "How the passport works" };
