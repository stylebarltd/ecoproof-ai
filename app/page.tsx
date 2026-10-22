import type { Metadata } from "next";
import { headers } from "next/headers";
import { cache } from "react";
import AppShell from "@/components/AppShell";
import Landing from "@/components/landing/Landing";
import MyShops from "@/components/MyShops";
import PassportHome from "@/components/PassportHome";
import RefreshOnAccountChange from "@/components/RefreshOnAccountChange";
import { landingStats } from "@/lib/landingStats";
import { myPlaces } from "@/lib/members";
import { getSession } from "@/lib/session";

// "/" depends on who is asking: signed out, the landing page for eco businesses; a customer, their eco passport; a shop owner or staff
// member, their "My shop" overview. Decided on the server from the session cookie, so nothing flashes.
const who = cache(async () => {
  const s = await getSession(await headers());
  if (!s) return "visitor" as const;
  return (await myPlaces(s.keys)).length ? ("owner" as const) : ("customer" as const);
}); // once per request, shared by the metadata and the page

export async function generateMetadata(): Promise<Metadata> {
  const w = await who();
  if (w === "visitor") return { title: "EcoProof AI · Verified eco impact for your customers", description: "Show your customers exactly how much plastic and CO₂ they saved with you, verified on Solana, not claimed. For eco shops, cafés, restaurants and hotels." };
  return { title: w === "owner" ? "My shop · EcoProof AI" : "My eco passport · EcoProof AI" };
}

export default async function Home() {
  const w = await who();
  if (w === "visitor") return <Landing stats={await landingStats()} />;
  return (
    <AppShell rootIs={w === "owner" ? "shop" : "passport"}>
      <RefreshOnAccountChange />
      {w === "owner" ? <MyShops /> : <PassportHome />}
    </AppShell>
  );
}
