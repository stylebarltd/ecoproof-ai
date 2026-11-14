"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import StampJourney, { type Door } from "@/components/landing/StampJourney";
import type { LandingRecord } from "@/lib/landingStats";

/** How a stamp lands on Solana, told the way a customer meets it, for the door the visitor runs: a visit (the QR on a café or hotel counter,
 *  the default, since most owners reading run one) or an online order (the QR in the order email). Each shows the QR, the phone replaying
 *  the real claim steps (StampJourney) and why the stamp stays checkable. The QR is the real demo café code: scannable on a computer screen,
 *  tappable on a phone, where you can't scan your own screen. */
const Cap = ({ children }: { children: React.ReactNode }) => <p className="mb-3 font-stamp text-[15px] uppercase tracking-[0.14em] text-cocoa/80">{children}</p>;
const DEMO = "/c/demo-cafe?src=qr";

const DOORS: { id: Door; label: string }[] = [
  { id: "visit", label: "A café or hotel visit" },
  { id: "order", label: "An online order" },
];

const PROMISES: Record<Door, string[]> = {
  visit: [
    "Nobody can edit it later, not even us.",
    "One stamp per visit: scanning again the same day gives nothing.",
    "Only a fingerprint goes on the chain. Never a name or an email.",
    "Your customers need no wallet and no coins. We pay the fee, a fraction of a cent.",
    "Still readable if EcoProof closed tomorrow.",
  ],
  order: [
    "Nobody can edit it later, not even us.",
    "The same order can never become a second stamp.",
    "Only a fingerprint goes on the chain. Never a name, an email or what they bought.",
    "Your customers need no wallet and no coins. We pay the fee, a fraction of a cent.",
    "Still readable if EcoProof closed tomorrow.",
  ],
};

function Qr({ qr }: { qr: string }) {
  return (
    <a href={DEMO} aria-label="Open the demo café's stamp page" className="block h-[140px] w-[140px] shrink-0 rounded-md [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
  );
}
const ScanHint = () => (
  <><span className="lg:hidden">Tap the code to try it.</span><span className="hidden lg:inline">Point your phone camera at the code.</span> No app, no account.</>
);

export default function SolanaJourney({ r, qr }: { r: LandingRecord | null; qr: string }) {
  const [door, setDoor] = useState<Door>("visit");
  const link = "font-extrabold underline decoration-sky decoration-[3px] underline-offset-4 hover:decoration-honey";
  return (
    <div className="mt-8">
      <div role="group" aria-label="Show the stamp for" className="inline-flex flex-wrap gap-1 rounded-full bg-kraft/40 p-1">
        {DOORS.map((d) => (
          <button key={d.id} type="button" aria-pressed={door === d.id} onClick={() => setDoor(d.id)} className={`h-11 rounded-full px-4 text-[15px] font-extrabold transition ${door === d.id ? "bg-cocoa text-paper" : "text-cocoa/80 hover:text-cocoa"}`}>{d.label}</button>
        ))}
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_auto_1fr] lg:items-start lg:gap-10">
        <div className="flex flex-col">
          {door === "visit" ? (
            <>
              <Cap>1 · The QR on your counter</Cap>
              <div className="sticker grain flex flex-col items-center rounded-[16px] bg-white p-5 text-center ring-1 ring-cocoa/10">
                <p className="font-journal-display text-[22px] font-bold leading-tight">Demo Café</p>
                <p className="mt-1 text-[15px] font-extrabold">Collect your eco stamp</p>
                <div className="mt-4"><Qr qr={qr} /></div>
                <p className="mt-4 text-[15px] leading-snug text-cocoa/80"><ScanHint /></p>
              </div>
            </>
          ) : (
            <>
              <Cap>1 · The QR in your order email</Cap>
              <div className="sticker grain flex flex-col rounded-[16px] bg-white p-5 ring-1 ring-cocoa/10">
                <p className="text-[13px] font-bold text-cocoa/80">{r ? r.merchant : "Your shop"} · Your order is on its way</p>
                <p className="mt-2 text-[18px] font-extrabold leading-snug">Thank you for choosing plastic-free.</p>
                <div className="mt-4 flex items-center gap-5">
                  <Qr qr={qr} />
                  <p className="text-[15px] leading-snug text-cocoa/80"><b className="font-extrabold">Collect your eco stamp.</b> <ScanHint /></p>
                </div>
              </div>
            </>
          )}
          <p className="mt-3 text-[13px] font-bold text-cocoa/80">This code works: it opens our demo café.</p>
        </div>
        <div className="flex flex-col">
          <Cap>2 · A few seconds on their phone</Cap>
          <StampJourney key={door} door={door} r={r} />
        </div>
        <div className="flex flex-col">
          <Cap>3 · And it stays that way</Cap>
          <div className="sticker grain flex flex-col rounded-[16px] bg-kraft/60 p-5">
            <p className="text-[18px] font-extrabold leading-snug">Years from now, the stamp is still on Solana, exactly as it was written.</p>
            <ul className="mt-4 space-y-2.5 text-[15px] leading-snug text-cocoa/85">
              {PROMISES[door].map((t) => <li key={t} className="flex gap-2"><Check size={16} strokeWidth={3} className="mt-0.5 shrink-0 text-leaf" aria-hidden /><span>{t}</span></li>)}
            </ul>
            <p className="pt-5 text-[15px]">
              {r ? <><a href={r.txUrl} target="_blank" rel="noopener" className={link}>See the newest stamp on Solana</a> · <a href="#proof" className={link}>check it yourself</a></> : <a href="#proof" className={link}>Check one yourself</a>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
