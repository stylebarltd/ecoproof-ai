"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, MapPin, ShoppingBag, Store } from "lucide-react";
import AccountChip from "@/components/AccountChip";
import { LeafMark, LogoLockup } from "@/components/Logo";
import { announceAccountChange, useDesktop } from "@/lib/desktop";

/** Desktop (lg+) navbar. Phones keep the bottom tab bar. The wallet chip mounts here only on desktop, so there is only ever one. */
export default function TopNav() {
  const path = usePathname();
  const desktop = useDesktop();
  const link = (href: string, icon: React.ReactNode, label: string, on: boolean) => (
    <Link href={href} aria-current={on ? "page" : undefined} className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px] transition ${on ? "bg-white/70 font-bold text-sage-800 ring-1 ring-white/80" : "font-semibold text-sage-900 hover:bg-white/45"}`}>
      {icon}{label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-[2000] hidden border-b border-white/70 bg-white/40 shadow-[0_4px_24px_rgba(39,46,27,0.10)] backdrop-blur-xl backdrop-saturate-150 lg:block print:hidden">
      <nav className="mx-auto flex h-16 max-w-[1280px] items-center gap-6 px-10" aria-label="Main">
        <Link href="/" aria-label="EcoProof AI, my passport" className="shrink-0"><LogoLockup size={34} /></Link>
        <div className="flex items-center gap-1">
          {link("/", <LeafMark size={18} stroke="currentColor" strokeWidth={2.75} />, "Passport", path === "/" || path.startsWith("/p/") || path.startsWith("/u/") || path.startsWith("/collection"))}
          {link("/map", <MapPin size={17} strokeWidth={2.5} />, "Map", path.startsWith("/map"))}
          {link("/shops", <ShoppingBag size={17} strokeWidth={2.5} />, "Shops", path.startsWith("/shops"))}
          {link("/join", <Store size={17} strokeWidth={2.5} />, "For brands", path.startsWith("/join") || path.startsWith("/place/") || path === "/shop" || path.startsWith("/shop/"))}
          {link("/about", <CircleHelp size={17} strokeWidth={2.5} />, "How it works", path.startsWith("/about") || path.startsWith("/rules"))}
        </div>
        <div className="ml-auto">{desktop && <AccountChip onChange={announceAccountChange} />}</div>
      </nav>
    </header>
  );
}
