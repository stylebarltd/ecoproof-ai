"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BookUser } from "lucide-react";

/** "Eco Passport" in the landing nav (next to Pricing). Signed out, but this device already collected stamps: the link turns leaf green and
 *  pulses slowly, so the visitor finds their passport (it lives at /passport). Only looks; never creates a passport for someone who just reads. */
export default function PassportNavLink({ className = "", onClick }: { className?: string; onClick?: () => void }) {
  const [stamps, setStamps] = useState(0);
  useEffect(() => {
    let id: string | null = null;
    try { id = localStorage.getItem("ecoproof-user"); } catch { return; }
    if (!id) return;
    fetch(`/api/passport?userId=${encodeURIComponent(id)}`).then((r) => (r.ok ? r.json() : null)).then((p) => { if (p?.totals?.receipts) setStamps(p.totals.receipts); }).catch(() => {});
  }, []);
  const has = stamps > 0;
  return (
    <Link href="/passport" onClick={onClick} className={`${className} ${has ? "passport-live text-leaf" : ""}`} title={has ? `This phone has an eco passport with ${stamps} ${stamps === 1 ? "stamp" : "stamps"}` : undefined}>
      <BookUser size={18} className="shrink-0" aria-hidden /> Eco Passport{has && <span className="sr-only"> ({stamps} {stamps === 1 ? "stamp" : "stamps"} on this phone)</span>}
    </Link>
  );
}
