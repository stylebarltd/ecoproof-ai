"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, ScanLine, ShoppingBag } from "lucide-react";
import { LeafMark } from "@/components/Logo";
import { isPassportPath, type RootIs } from "@/lib/nav";

export default function BottomNav({ rootIs = "passport" }: { rootIs?: RootIs }) {
  const path = usePathname();
  const tab = (href: string, icon: React.ReactNode, label: string, on: boolean) => (
    <Link href={href} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${on ? "font-bold text-sage-700" : "text-neutral-400"}`}>
      {icon}{label}
    </Link>
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[2000] mx-auto flex max-w-md border-t border-neutral-200 bg-cream md:max-w-2xl md:rounded-t-2xl md:border-x lg:hidden">
      {tab("/passport", <LeafMark size={24} stroke="currentColor" strokeWidth={2.5} />, "Passport", isPassportPath(path, rootIs))}
      {tab("/map", <MapPin size={24} strokeWidth={2.5} />, "Map", path.startsWith("/map"))}
      {/* Scan sits in the middle, raised: the one action of the app (Pola, 2026-11-20: scanning has its own tab, not buttons on the passport) */}
      <Link href="/scan" aria-current={path.startsWith("/scan") ? "page" : undefined} className={`flex flex-1 flex-col items-center gap-0.5 pb-2 text-[11px] ${path.startsWith("/scan") ? "font-bold text-sage-700" : "font-semibold text-neutral-500"}`}>
        <span className="-mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-honey-500 text-ink shadow-[0_4px_12px_rgba(58,42,28,0.25)] ring-4 ring-cream"><ScanLine size={24} strokeWidth={2.5} /></span>Scan
      </Link>
      {tab("/shops", <ShoppingBag size={24} strokeWidth={2.5} />, "Shops", path.startsWith("/shops"))}
    </nav>
  );
}
