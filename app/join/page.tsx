import type { Metadata } from "next";
import JoinFlow from "@/components/landing/JoinFlow";
import LandingNav from "@/components/landing/LandingNav";
import { journalFonts } from "@/components/landing/fonts";

export const metadata: Metadata = {
  title: "Join as a business · EcoProof AI",
  description: "Set up your café, restaurant, hotel or eco shop on EcoProof in about 10 minutes. The first 50 businesses join free.",
};

/** Where every "Join as a business" on the landing leads. It sits outside the (app) group on purpose: it wears the landing's travel-journal chrome
 *  (DESIGN.md), not the legacy app shell, so the hand-off from the landing page looks like the same place. */
export default function JoinPage() {
  return (
    <div className={`journal grain min-h-screen ${journalFonts}`}>
      <LandingNav page="join" />
      <main className="px-4 pb-20 pt-10 sm:px-6 lg:pt-14">
        <div className="mx-auto max-w-[1000px]"><JoinFlow /></div>
      </main>
    </div>
  );
}
