// Copy that changes without a redesign: the landing page's pricing and the example passport it links to. Final prices are still to be decided.

export const PRICING = [
  { name: "Founding", price: "Free", period: "", note: "The first 50 businesses. Everything included, for as long as EcoProof exists." },
  { name: "Early", price: "from $50", period: "/ year", note: "Locked for life for everyone who joins in the first year." },
  { name: "Standard", price: "$200", period: "/ year", note: "Unlimited stamps, proofs and staff. Cancel any time." },
] as const;

/** "See a live passport": the public id of a passport worth showing (LANDING_DEMO_PASSPORT), else the guide. */
export const demoPassportHref = () => (process.env.LANDING_DEMO_PASSPORT ? `/u/${process.env.LANDING_DEMO_PASSPORT}` : "/about#customers");
