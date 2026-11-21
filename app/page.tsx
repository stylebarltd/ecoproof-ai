import type { Metadata } from "next";
import { headers } from "next/headers";
import { cache } from "react";
import AppShell from "@/components/AppShell";
import Landing from "@/components/landing/Landing";
import MyShops from "@/components/MyShops";
import RefreshOnAccountChange from "@/components/RefreshOnAccountChange";
import { landingStats } from "@/lib/landingStats";
import { myPlaces } from "@/lib/members";
import { getSession } from "@/lib/session";

// "/" is the homepage for visitors and signed-in customers alike (Pola, 2026-11-20; before that a signed-in customer got the passport here, which left the
// homepage unreachable once signed in). Someone who runs a place (owner or staff) lands on "My shop" as before: that is where their work is. The passport
// lives at /passport; the installed app opens there (start_url in public/manifest.webmanifest).
const isOwner = cache(async () => {
  const s = await getSession(await headers());
  return !!s && (await myPlaces(s.keys)).length > 0;
}); // once per request, shared by the metadata and the page

export async function generateMetadata(): Promise<Metadata> {
  if (await isOwner()) return { title: "My shop · EcoProof" };
  return {
    title: "EcoProof · Every eco choice earns a stamp",
    description: "Collect a stamp for every eco choice, at cafés, restaurants, hotels and eco shops. Each one is recorded on Solana, so it can be checked and never changed quietly.",
  };
}

export default async function Home() {
  if (await isOwner()) return (
    <AppShell rootIs="shop">
      <RefreshOnAccountChange />
      <MyShops />
    </AppShell>
  );
  return (
    <>
      <RefreshOnAccountChange />
      <Landing stats={await landingStats()} />
    </>
  );
}
