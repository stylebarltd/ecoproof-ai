// Copy that changes without a redesign: the landing page's pricing and the example passport it links to.

/** Pricing cards. Only the founding offer has a price; the price after the first 50 is not decided yet (Nov 2026), so the page says how it
 *  will work instead of printing a number. Once it is decided, give the second card a `price` and `period` and it shows as a figure. */
export const PRICING: { name: string; price?: string; period?: string; note: string }[] = [
  { name: "Founding", price: "Free", note: "The first 50 businesses. Everything included, for as long as EcoProof exists. Founding businesses never pay." },
  { name: "After the first 50", note: "A simple yearly price per place. It will be shown here before anyone is asked to pay." },
];

/** "See a live passport": the public id of a passport worth showing (LANDING_DEMO_PASSPORT), else the guide. */
export const demoPassportHref = () => (process.env.LANDING_DEMO_PASSPORT ? `/u/${process.env.LANDING_DEMO_PASSPORT}` : "/about#customers");
