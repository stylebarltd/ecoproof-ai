import type { Metadata } from "next";
import JoinFlow from "@/components/landing/JoinFlow";
import LandingNav from "@/components/landing/LandingNav";
import { journalFonts } from "@/components/landing/fonts";
import { headers } from "next/headers";
import { isKind } from "@/lib/placeKinds";

export const metadata: Metadata = {
  title: "Join as a business · EcoProof AI",
  description: "Set up your café, restaurant, hotel or eco shop on EcoProof in about 10 minutes. The first 50 businesses join free.",
};

/** Where every "Join as a business" on the landing leads. It sits outside the (app) group on purpose: it wears the landing's travel-journal chrome
 *  (DESIGN.md), not the legacy app shell, so the hand-off from the landing page looks like the same place. */
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  // The landing's business cards link here with ?kind=, so "Join as a hotel" starts on Hotel.
  const { kind } = await searchParams;
  // Where the map starts when an owner pins their place: Vercel's approximate location of the visitor (city level), absent locally.
  const h = await headers();
  const lat = Number(h.get("x-vercel-ip-latitude")), lng = Number(h.get("x-vercel-ip-longitude"));
  const near = h.get("x-vercel-ip-latitude") && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  return (
    <div className={`journal grain min-h-screen ${journalFonts}`}>
      <LandingNav page="join" />
      <main className="px-4 pb-20 pt-10 sm:px-6 lg:pt-14">
        <div className="mx-auto max-w-[1000px]"><JoinFlow initialKind={kind && isKind(kind) ? kind : undefined} near={near} /></div>
      </main>
    </div>
  );
}
