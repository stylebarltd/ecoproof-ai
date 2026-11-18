"use client";
import { useState } from "react";
import Image from "next/image";
import { Check, Play } from "lucide-react";
import StampJourney, { type Door } from "@/components/landing/StampJourney";
import type { LandingRecord } from "@/lib/landingStats";

/** "Live in three steps" and how a stamp lands on Solana, as one row (merged 2026-11-18, Pola: the two sections said the same thing),
 *  for the door the visitor runs: a visit (the postcard with the QR on a café or hotel counter, the default, since most owners reading
 *  run one) or an online order (the stamp block in the order email). Column 1 is what the owner sets up, as a picture: the real
 *  postcard in a café (art/postcard) or the plugin's own email block (art/steps/email). Column 2 is what the customer does: the stamp
 *  picture, the phone replaying the real claim steps behind one tap (StampJourney), and sharing. Column 3 is what Solana is and why the
 *  stamp stays checkable. */
const Cap = ({ children }: { children: React.ReactNode }) => <p className="mb-3 font-stamp text-[15px] uppercase tracking-[0.14em] text-cocoa/80">{children}</p>;
const GUIDE = "/about#customers";
const PIC = "/landing/steps/v2";

const DOORS: { id: Door; label: string }[] = [
  { id: "visit", label: "A café or hotel visit" },
  { id: "order", label: "An online order" },
];

const SETUP: Record<Door, { cap: string; title: string; body: string }> = {
  visit: { cap: "The QR on your counter", title: "Print your postcard", body: "One card for the counter or the tables. It tells customers what EcoProof is and carries your QR code." },
  order: { cap: "The QR in your order email", title: "Connect your shop", body: "Install our WooCommerce plugin, or put claim cards in your parcels. Every paid order then comes with a stamp to collect." },
};

const PROMISES: Record<Door, string[]> = {
  visit: [
    "Nobody can edit it later, not even us.",
    "One stamp per visit: scanning again the same day gives nothing.",
    "Only a fingerprint goes on the chain. Never a name or an email.",
    "Still readable if EcoProof closed tomorrow.",
  ],
  order: [
    "Nobody can edit it later, not even us.",
    "The same order can never become a second stamp.",
    "Only a fingerprint goes on the chain. Never a name, an email or what they bought.",
    "Still readable if EcoProof closed tomorrow.",
  ],
};

export default function SolanaJourney({ r }: { r: LandingRecord | null }) {
  const [door, setDoor] = useState<Door>("visit");
  // The replay is behind one tap (critique run 8): closed, the column shows the stamp picture instead of a 520px phone on every visit.
  const [open, setOpen] = useState(false);
  const link = "font-extrabold underline decoration-sky decoration-[3px] underline-offset-4 hover:decoration-honey";
  const setup = SETUP[door];
  const steps = (door === "visit" ? ["Their location is checked", "One stamp per visit, once a day"] : ["Their order is read", "What it saved is worked out"]).concat(["The proof is written to Solana", "The stamp lands in their passport"]);
  return (
    <div className="mt-8">
      <div role="group" aria-label="Show the steps for" className="inline-flex flex-wrap gap-1 rounded-full bg-kraft/40 p-1">
        {DOORS.map((d) => (
          <button key={d.id} type="button" aria-pressed={door === d.id} onClick={() => setDoor(d.id)} className={`h-11 rounded-full px-4 text-[15px] font-extrabold transition ${door === d.id ? "bg-cocoa text-paper" : "text-cocoa/80 hover:text-cocoa"}`}>{d.label}</button>
        ))}
      </div>
      <ol className="mt-6 grid gap-10 lg:grid-cols-3 lg:items-start lg:gap-10">
        <li className="flex flex-col">
          <Cap>1 · {setup.cap}</Cap>
          {door === "visit" ? (
            <Image src={`${PIC}/connect.webp`} alt="A café counter with the EcoProof postcard on a wooden stand beside a cup of coffee: Collect an eco stamp for your visit, a QR code, three steps and the Bee Guardian" width={800} height={800} sizes="(min-width: 1024px) 360px, 100vw" className="sticker aspect-square w-full object-cover" style={{ transform: "rotate(-1deg)" }} />
          ) : (
            <Image src={`${PIC}/email.webp`} alt="The stamp block of an order email: a Bee Guardian, You just did something good for the planet, what the order avoided, a Collect my stamp button and a QR code" width={720} height={1378} sizes="300px" className="sticker mx-auto w-full max-w-[300px] rounded-[14px]" style={{ transform: "rotate(-1deg)" }} />
          )}
          <h3 className="mt-6 text-[22px] leading-tight">{setup.title}</h3>
          <p className="mt-2 text-[16px] leading-[1.6] text-cocoa/80">{setup.body}</p>
        </li>
        <li className="flex flex-col">
          <Cap>2 · A few seconds on their phone</Cap>
          {open ? <StampJourney key={door} door={door} r={r} /> : (
            <Image src={`${PIC}/stamp.webp`} alt="Four steps on kraft paper: a phone scans the EcoProof QR code, the record is hashed and written to Solana as a proof, the stamp lands in the eco passport, and the Sentinel Bee Guardian card is minted" width={800} height={800} sizes="(min-width: 1024px) 360px, 100vw" className="sticker aspect-square w-full object-cover" style={{ transform: "rotate(1.2deg)" }} />
          )}
          <h3 className="mt-6 text-[22px] leading-tight">Every {door === "visit" ? "visit" : "verified order"} becomes a stamp</h3>
          <ol className="mt-2 space-y-1 text-[16px] leading-[1.5] text-cocoa/80">
            {steps.map((t, i) => <li key={t} className="flex gap-2"><span className="w-4 shrink-0 font-extrabold">{i + 1}</span><span>{t}</span></li>)}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" aria-pressed={open} onClick={() => setOpen((v) => !v)} className="inline-flex h-11 items-center gap-2 rounded-full bg-kraft/60 px-4 text-[15px] font-extrabold text-cocoa ring-1 ring-cocoa/15 hover:bg-kraft">
              {open ? "Show the picture" : <><Play size={15} aria-hidden /> Watch it on a phone</>}
            </button>
            {/* Phones can't scan a code on their own screen, so they get the guide as a button (critique run 5 found it missing). */}
            <a href={GUIDE} className="inline-flex h-11 items-center justify-center rounded-full bg-cocoa px-5 text-[15px] font-extrabold text-paper hover:bg-honey-ink lg:hidden">How to collect a stamp</a>
          </div>
          {/* Sharing is the customer's last step, so it lives in their column (it was step 3 of "Live in three steps"). */}
          <div className="mt-6 flex items-center gap-4 rounded-[16px] bg-white p-3 ring-1 ring-cocoa/10">
            <Image src={`${PIC}/share.webp`} alt="The share image of a passport: the Warden Bee Guardian rank card, 7 points and stamps from three places, verified on Solana" width={800} height={800} sizes="96px" className="h-24 w-24 shrink-0 rounded-[10px] object-cover" />
            <p className="text-[15px] leading-snug text-cocoa/85"><b className="font-extrabold text-cocoa">Then they share it, and you get the credit.</b> Every stamp carries your name, and sharing takes one tap.</p>
          </div>
        </li>
        {/* Why the stamp is on Solana, and what that promises: the plain-words explainer for readers who are not blockchain people
            (Pola, 2026-11-17) lives in this column since 2026-11-18. The hero's SolanaTip links to #why-chain. */}
        <li id="why-chain" className="flex scroll-mt-20 flex-col">
          <Cap>3 · And it stays that way</Cap>
          <div className="sticker grain flex flex-col rounded-[16px] bg-kraft/60 p-5">
            <h3 className="text-[22px] leading-[1.15]">What is Solana, and why put a coffee stamp on it?</h3>
            <p className="mt-2 text-[15px] leading-[1.55] text-cocoa/85">Solana is a public blockchain: a record book kept by many independent computers around the world instead of by one company. What is written there can&apos;t be changed or deleted, not by the shop and not by us. Your customers never notice the technology: no wallet, no coins, no app.</p>
            <p className="mt-4 text-[16px] font-extrabold leading-snug">Years from now, the stamp is still there, exactly as it was written.</p>
            <ul className="mt-3 space-y-2.5 text-[15px] leading-snug text-cocoa/85">
              {PROMISES[door].map((t) => <li key={t} className="flex gap-2"><Check size={16} strokeWidth={3} className="mt-0.5 shrink-0 text-leaf-ink" aria-hidden /><span>{t}</span></li>)}
            </ul>
            {/* Honest limits: a QR proves a visit, not a purchase; the promises hold on mainnet, and the hackathon build writes to devnet, which can be reset. */}
            <p className="mt-4 text-[14px] leading-snug text-cocoa/80">A QR stamp proves a visit; only a verified order proves a purchase. Today&apos;s proofs are on Solana devnet, a test network. From launch they are written to mainnet, where these promises hold.</p>
            <p className="pt-4 text-[15px]">
              {r ? <a href={r.txUrl} target="_blank" rel="noopener" className={link}>See the newest stamp on Solana</a> : <a href="#proof" className={link}>Check a record yourself</a>}
            </p>
          </div>
        </li>
      </ol>
    </div>
  );
}
