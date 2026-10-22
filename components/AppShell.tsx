import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import type { RootIs } from "@/lib/nav";

/** The app's chrome: desktop navbar, one narrow column on phones, bottom tabs. Every app route gets it from app/(app)/layout.tsx; the root
 *  page adds it itself when it shows the passport or the owner's overview (signed out, the root is the landing page without it). */
export default function AppShell({ children, rootIs = "passport" }: { children: React.ReactNode; rootIs?: RootIs }) {
  return (
    <>
      <TopNav rootIs={rootIs} />
      {/* Phones: one narrow column above the bottom tabs. Tablet: a little wider. Desktop: a 1280px container under the top navbar. */}
      <main className="mx-auto max-w-md px-5 pt-5 pb-24 md:max-w-2xl md:px-8 lg:max-w-[1280px] lg:px-10 lg:pt-8 lg:pb-16">{children}</main>
      <BottomNav rootIs={rootIs} />
    </>
  );
}
