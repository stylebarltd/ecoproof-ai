"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, MapPin } from "lucide-react";
import { LeafMark } from "@/components/Logo";

export default function BottomNav() {
  const path = usePathname();
  const tab = (href: string, icon: React.ReactNode, label: string, on: boolean) => (
    <Link href={href} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${on ? "font-bold text-sage-700" : "text-neutral-400"}`}>
      {icon}{label}
    </Link>
  );
  const passport = path === "/" || path.startsWith("/p/");
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[2000] mx-auto flex max-w-md border-t border-neutral-200 bg-cream">
      {tab("/", <LeafMark size={24} stroke="currentColor" strokeWidth={2.5} />, "Passport", passport)}
      {tab("/map", <MapPin size={24} strokeWidth={2.5} />, "Map", path.startsWith("/map"))}
      {tab("/about", <CircleHelp size={24} strokeWidth={2.5} />, "How it works", path.startsWith("/about") || path.startsWith("/rules"))}
    </nav>
  );
}
