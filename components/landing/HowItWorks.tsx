"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Play } from "lucide-react";
import StampJourney from "@/components/landing/StampJourney";
import type { LandingRecord } from "@/lib/landingStats";
import { POINTS_BY_KIND, POINTS_VERIFIED, pointsLabel } from "@/lib/stampClasses";

/** "How it works": the whole journey as a carousel of three slides, right under the hero (Pola, 2026-11-18; before it was the three
 *  columns of "Live in three steps"). Slide 1 is where the customer finds the QR code, as three pictures: the postcard on a counter
 *  (art/postcard), an arrived parcel at home, with the real parcel card (a business card) in the box and the plugin's own order email on a tablet (art/steps/email) and the receipt scan in an eco shop (the eco shop door photo).
 *  Slide 2 is the few seconds on the phone: the stamp picture, the replay of the real claim steps behind one tap (StampJourney),
 *  the four steps worded for a visit and an order at once, and sharing. The copy speaks to customers and businesses alike (Pola,
 *  2026-11-18): no "your customers", no "they". Slide 3 is what Solana is and why the stamp stays checkable; it carries #why-chain, which the hero's
 *  SolanaTip and the footer link to, so that hash opens it. The slides sit in one scroll-snap row: swipe on a phone, tabs and arrows
 *  everywhere. Points come from lib/stampClasses.ts, never typed here. */
const PIC = "/landing/steps/v2";
const GUIDE = "/about#customers";
const TABS = ["Find the QR code", "A few seconds on the phone", "And it stays that way"];

const visits = [POINTS_BY_KIND.cafe, POINTS_BY_KIND.restaurant, POINTS_BY_KIND.hotel];
const VISIT_POINTS = `${Math.min(...visits)}–${Math.max(...visits)} points`;

const PLACES: { cap: string; title: string; points: string; src: string; alt: string }[] = [
  { cap: "The QR code on the counter", title: "Café, restaurant, hotel or resort", points: `${VISIT_POINTS} for each visit, once a day.`,
    src: `${PIC}/counter.webp`,
    alt: "A café counter with the EcoProof postcard on a wooden stand beside a cup of coffee: Collect an eco stamp for your visit, a QR code, three steps and the Bee Guardian" },
  { cap: "The receipt from the till", title: "A purchase in an eco shop", points: `${pointsLabel(POINTS_VERIFIED)} for a photo of the receipt, taken in the shop. ${pointsLabel(POINTS_BY_KIND.eco_shop)} for the QR code at the till.`,
    src: "/landing/doors/v3/store.webp",
    alt: "The counter of an eco shop: a customer photographs the till receipt with a phone, and the screen shows what the purchase avoided" },
  { cap: "The QR code in the order email or the parcel", title: "An online order", points: `${pointsLabel(POINTS_VERIFIED)} for each verified order.`,
    src: `${PIC}/parcel-home.webp`,
    alt: "A kitchen table with an opened parcel: in it lies the small EcoProof card, the size of a business card, Your order earns an eco stamp with a QR code and the bee. Beside the parcel a tablet shows the order email with a Collect my stamp button and a QR code" },
];

const STEPS = [
  "The location is checked, or the order is read",
  "One stamp per visit, and an order's savings are worked out",
  "The proof is written to Solana",
  "The stamp lands in the eco passport",
];

const PROMISES = [
  "Nobody can edit it later, not even us.",
  "One stamp per visit or order: a second scan gives nothing.",
  "Only a fingerprint goes on the chain. Never a name, an email or what was bought.",
  "Still readable if EcoProof closed tomorrow.",
];

export default function HowItWorks({ r }: { r: LandingRecord | null }) {
  const row = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  // The replay is behind one tap (critique run 8): closed, the slide shows the stamp picture instead of a 520px phone.
  const [open, setOpen] = useState(false);
  const next = "inline-flex h-11 items-center gap-2 rounded-full bg-cocoa px-5 text-[15px] font-extrabold text-paper hover:bg-honey-ink";
  const link = "font-extrabold underline decoration-sky decoration-[3px] underline-offset-4 hover:decoration-honey";

  const show = useCallback((i: number, smooth = true) => {
    const el = row.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }, []);
  // #why-chain is slide 3: open it when the page arrives with that hash or a link on the page sets it.
  useEffect(() => {
    const onHash = () => { if (window.location.hash === "#why-chain") show(2, false); };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [show]);

  // The row is as tall as the slide on show, not as the tallest one: a short slide leaves no empty band under it.
  const [height, setHeight] = useState<number>();
  useEffect(() => {
    const el = row.current?.children[slide] as HTMLElement | undefined;
    if (!el) return;
    const fit = () => setHeight(el.offsetHeight);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [slide]);

  const slideCls = "w-full shrink-0 snap-start px-1 py-3";
  return (
    <div className="mt-8">
      <div role="tablist" aria-label="How it works, step by step" className="flex flex-wrap gap-1 rounded-[22px] bg-kraft/40 p-1 sm:inline-flex sm:rounded-full">
        {TABS.map((t, i) => (
          <button key={t} type="button" role="tab" id={`how-tab-${i}`} aria-selected={slide === i} aria-controls={`how-slide-${i}`} onClick={() => show(i)}
            className={`flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-extrabold transition ${slide === i ? "bg-cocoa text-paper" : "text-cocoa/80 hover:text-cocoa"}`}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] ${slide === i ? "bg-honey text-cocoa" : "bg-cocoa/10"}`}>{i + 1}</span>{t}
          </button>
        ))}
      </div>

      <div ref={row} onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        style={{ height }}
        className="mt-4 flex snap-x snap-mandatory items-start overflow-x-auto overflow-y-hidden scroll-smooth transition-[height] duration-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* 1. Where the QR code is: one picture per kind of business, and what a stamp there is worth. */}
        <div id="how-slide-0" role="tabpanel" aria-labelledby="how-tab-0" inert={slide !== 0} className={slideCls}>
          <h3 className="text-[22px] leading-tight">Three places to find it</h3>
          <ul className="mt-5 grid gap-5 md:grid-cols-3 md:gap-8">
            {PLACES.map((p, i) => (
              <li key={p.cap} className="flex gap-4 md:flex-col md:gap-0">
                <Image src={p.src} alt={p.alt} width={800} height={800} sizes="(min-width: 768px) 360px, 112px"
                  className="sticker h-28 w-28 shrink-0 object-cover md:aspect-square md:h-auto md:w-full" style={{ transform: `rotate(${[-1, 1.2, -0.8][i]}deg)` }} />
                <div className="min-w-0 md:mt-5">
                  <p className="font-stamp text-[14px] uppercase tracking-[0.14em] text-cocoa/80">{p.cap}</p>
                  <p className="mt-1 text-[19px] font-extrabold leading-tight">{p.title}</p>
                  <p className="mt-1 text-[15px] leading-snug text-cocoa/80">{p.points}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* 2. What the customer does: scan, a few seconds, share. */}
        <div id="how-slide-1" role="tabpanel" aria-labelledby="how-tab-1" inert={slide !== 1} className={slideCls}>
          <div className="grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center md:gap-12">
            <div className="mx-auto w-full max-w-[420px]">
              {open ? <StampJourney door="visit" r={r} /> : (
                <Image src={`${PIC}/stamp.webp`} alt="Four steps on kraft paper: a phone scans the EcoProof QR code, the record is hashed and written to Solana as a proof, the stamp lands in the eco passport, and the Sentinel Bee Guardian card is minted" width={800} height={800} sizes="(min-width: 768px) 420px, 100vw" className="sticker aspect-square w-full object-cover" style={{ transform: "rotate(1.2deg)" }} />
              )}
            </div>
            <div>
              <h3 className="text-[22px] leading-tight">Every visit or verified order becomes a stamp</h3>
              <ol className="mt-3 space-y-1 text-[16px] leading-[1.5] text-cocoa/80">
                {STEPS.map((t, i) => <li key={t} className="flex gap-2"><span className="w-4 shrink-0 font-extrabold">{i + 1}</span><span>{t}</span></li>)}
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" aria-pressed={open} onClick={() => setOpen((v) => !v)} className="inline-flex h-11 items-center gap-2 rounded-full bg-kraft/60 px-4 text-[15px] font-extrabold text-cocoa ring-1 ring-cocoa/15 hover:bg-kraft">
                  {open ? "Show the picture" : <><Play size={15} aria-hidden /> Watch it on a phone</>}
                </button>
                {/* Phones can't scan a code on their own screen, so they get the guide as a button (critique run 5 found it missing). */}
                <a href={GUIDE} className="inline-flex h-11 items-center justify-center rounded-full bg-cocoa px-5 text-[15px] font-extrabold text-paper hover:bg-honey-ink lg:hidden">How to collect a stamp</a>
              </div>
              {/* Sharing is the customer's last step. */}
              <div className="mt-6 flex max-w-[460px] items-center gap-4 rounded-[16px] bg-white p-3 ring-1 ring-cocoa/10">
                <Image src={`${PIC}/share.webp`} alt="The share image of a passport: the Warden Bee Guardian rank card, 7 points and stamps from three places, verified on Solana" width={800} height={800} sizes="96px" className="h-24 w-24 shrink-0 rounded-[10px] object-cover" />
                <p className="text-[15px] leading-snug text-cocoa/85"><b className="font-extrabold text-cocoa">Then it gets shared.</b> Every stamp carries the name of the place it came from, and sharing takes one tap.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Why the stamp is on Solana, and what that promises: the plain-words explainer for readers who are not blockchain people
            (Pola, 2026-11-17). */}
        <div id="how-slide-2" role="tabpanel" aria-labelledby="how-tab-2" inert={slide !== 2} className={slideCls}>
          <div id="why-chain" className="sticker grain grid scroll-mt-24 gap-6 rounded-[16px] bg-kraft/60 p-5 md:grid-cols-2 md:gap-10 md:p-8">
            <div>
              <h3 className="text-[22px] leading-[1.15]">What is Solana, and why put a coffee stamp on it?</h3>
              <p className="mt-2 text-[16px] leading-[1.6] text-cocoa/85">Solana is a public blockchain: a record book kept by many independent computers around the world instead of by one company. What is written there can&apos;t be changed or deleted, not by the shop and not by us. Nobody has to notice the technology: no wallet, no coins, no app.</p>
              <Image src={`${PIC}/proof.webp`} alt="A paper card headed Proof on Solana: one scan, one stamp, one record, with the place, the time, a fingerprint of the record and a green Verified stamp. Anyone can recompute it, nobody can fake it" width={685} height={572} sizes="(min-width: 768px) 380px, 100vw" className="sticker mt-5 w-full max-w-[380px] rounded-[14px]" style={{ transform: "rotate(-1deg)" }} />
            </div>
            <div>
              <p className="text-[18px] font-extrabold leading-snug">Years from now, the stamp is still there, exactly as it was written.</p>
              <ul className="mt-3 space-y-2.5 text-[15px] leading-snug text-cocoa/85">
                {PROMISES.map((t) => <li key={t} className="flex gap-2"><Check size={16} strokeWidth={3} className="mt-0.5 shrink-0 text-leaf-ink" aria-hidden /><span>{t}</span></li>)}
              </ul>
              {/* Honest limits: a QR proves a visit, not a purchase; the promises hold on mainnet, and the hackathon build writes to devnet, which can be reset. */}
              <p className="mt-4 text-[14px] leading-snug text-cocoa/80">A QR stamp proves a visit; only a verified order proves a purchase. Today&apos;s proofs are on Solana devnet, a test network. From launch they are written to mainnet, where these promises hold.</p>
              <p className="pt-4 text-[15px]">
                {r ? <a href={r.txUrl} target="_blank" rel="noopener" className={link}>See the newest stamp on Solana</a> : <a href="#proof" className={link}>Check a record yourself</a>}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button type="button" onClick={() => show(slide - 1)} disabled={slide === 0} aria-label="Previous step" className="flex h-11 w-11 items-center justify-center rounded-full bg-kraft/60 text-cocoa ring-1 ring-cocoa/15 hover:bg-kraft disabled:opacity-40"><ArrowLeft size={18} aria-hidden /></button>
        {slide < TABS.length - 1 ? (
          <button type="button" onClick={() => show(slide + 1)} className={next}>Next: {TABS[slide + 1]} <ArrowRight size={16} aria-hidden /></button>
        ) : (
          <Link href="/join" className={next}>Add place <ArrowRight size={16} aria-hidden /></Link>
        )}
      </div>
    </div>
  );
}
