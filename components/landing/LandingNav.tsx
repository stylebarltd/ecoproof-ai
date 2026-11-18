"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import AccountChip from "@/components/AccountChip";
import PassportNavLink from "@/components/landing/PassportNavLink";
import { JournalWordmark, SECTIONS } from "@/components/landing/shared";
import { announceAccountChange } from "@/lib/desktop";

/** The landing page's top bar: section links, "Eco Passport" (green and pulsing when this device already has stamps), "Add place", and the
 *  account chip (signing in swaps the page for the passport). On /join (`page="join"`) the section links lead back to the landing and the join
 *  button is left out, since that is where the visitor already is. */
export default function LandingNav({ page = "home" }: { page?: "home" | "join" }) {
  const [open, setOpen] = useState(false);
  const home = page === "home";
  const sections = SECTIONS.map(([href, label]) => [home ? href : `/${href}`, label] as const);
  return (
    <header className="sticky top-0 z-[2000] border-b border-cocoa/10 bg-paper/95 backdrop-blur-sm">
      <nav className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4 sm:px-6" aria-label="Main">
        <Link href="/" className="shrink-0" aria-label="EcoProof"><JournalWordmark /></Link>
        <div className="ml-6 hidden items-center gap-1 md:flex">
          {sections.map(([href, label]) => <a key={href} href={href} className="rounded-full px-3.5 py-2 text-[15px] font-bold text-cocoa/80 hover:bg-kraft/40 hover:text-cocoa">{label}</a>)}
          <PassportNavLink className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[15px] font-bold text-cocoa/80 hover:bg-kraft/40 hover:text-cocoa" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <AccountChip onChange={announceAccountChange} />
          {home && <Link href="/join" className="hidden h-11 items-center rounded-full bg-cocoa px-5 text-[15px] font-extrabold text-paper hover:bg-honey-ink md:inline-flex">Add place</Link>}
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="landing-menu" aria-label={open ? "Close menu" : "Open menu"} className="flex h-11 w-11 items-center justify-center rounded-full text-cocoa hover:bg-kraft/40 md:hidden">
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>
      {open && (
        <div id="landing-menu" className="border-t border-cocoa/10 bg-paper px-4 pb-4 pt-2 md:hidden">
          {sections.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-[16px] font-bold text-cocoa hover:bg-kraft/40">{label}</a>)}
          <PassportNavLink onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-3 text-[16px] font-bold text-cocoa hover:bg-kraft/40" />
          {home && <Link href="/join" className="mt-2 flex h-12 items-center justify-center rounded-full bg-cocoa text-[16px] font-extrabold text-paper hover:bg-honey-ink">Add place</Link>}
        </div>
      )}
    </header>
  );
}
