"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const path = usePathname();
  const tab = (href: string, icon: string, label: string, on: boolean) => (
    <Link href={href} className={`flex flex-1 flex-col items-center py-2 text-xs ${on ? "font-semibold text-emerald-300" : "text-emerald-500"}`}>
      <span className="text-xl">{icon}</span>{label}
    </Link>
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[2000] mx-auto flex max-w-md border-t border-emerald-800 bg-emerald-950/95 backdrop-blur">
      {tab("/", "🌱", "Passport", path === "/" || path.startsWith("/p/"))}
      {tab("/map", "🗺️", "Map", path.startsWith("/map"))}
    </nav>
  );
}
