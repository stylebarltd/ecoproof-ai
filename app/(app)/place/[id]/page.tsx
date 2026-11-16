import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { journalFonts } from "@/components/landing/fonts";
import { LeafMark } from "@/components/Logo";
import PrintButton from "@/components/PrintButton";
import Stars from "@/components/Stars";
import { SAGE } from "@/lib/brand";
import { declarationsOf, publishedAnswers } from "@/lib/declarations";
import { rating } from "@/lib/practices";
import type { PlaceKind } from "@/lib/placeKinds";
import { getPlace, toPublic } from "@/lib/stampPlaces";

export const dynamic = "force-dynamic";
export const metadata = { title: "Print your postcard | EcoProof AI", robots: { index: false } };

/** What the customer did here, in the postcard's headline: "Collect an eco stamp for your stay". */
const HERE: Record<PlaceKind, string> = { cafe: "visit", restaurant: "meal", hotel: "stay", eco_shop: "visit" };

/**
 * The place's postcard for the counter or the table: what EcoProof AI is, why to scan, and the claim QR. A customer who has never heard
 * of EcoProof AI should understand it without asking. Prints as four A6 postcards on one A4 sheet (cut once each way), or as one A4 poster
 * (?size=a4). Every measure inside the card is in cqw (1% of the card's width), so both sizes are the same design.
 */
export default async function PlacePostcard({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ size?: string }> }) {
  const place = await getPlace((await params).id);
  if (!place) notFound();
  const poster = (await searchParams).size === "a4";
  const p = toPublic(place);
  const r = rating(place.kind, place.also_cafe, publishedAnswers(place, (await declarationsOf(place.id))[0]));
  const qr = await QRCode.toString(p.claimUrl, { type: "svg", margin: 0, errorCorrectionLevel: "Q", color: { dark: "#3a2a1c", light: "#ffffff" } });
  const qrSrc = `data:image/svg+xml;utf8,${encodeURIComponent(qr)}`;
  const steps: [string, string][] = [
    ["Scan the code", "with your phone's camera. No app to install, no sign-up."],
    ["Get your stamp", p.requiresGps ? "in your free eco passport. One a day, and we check you're really here." : "in your free eco passport. You can collect one a day here."],
    ["Meet your Bee Guardian", "Your first stamp unlocks it, and it levels up as you visit more eco places."],
  ];

  const card = (
    <div className="pc">
      <div className="pc-in">
        <div className="pc-top">
          <span className="pc-brand">
            <span className="pc-tile" style={{ background: SAGE }}><LeafMark size={100} /></span>
            <span>EcoProof<b> AI</b></span>
          </span>
          <span className="pc-mark">Eco passport</span>
        </div>

        <h1 className="pc-h">Collect an eco stamp for your {HERE[place.kind as PlaceKind] ?? "visit"}</h1>
        <p className="pc-lead">EcoProof AI is the passport for people who choose places that cut plastic and waste. <b>{place.name}</b> is one of them.</p>

        <div className="pc-scan">
          <div className="pc-qr">
            {/* eslint-disable-next-line @next/next/no-img-element -- an inline SVG */}
            <img src={qrSrc} alt={`QR code: collect your ${place.name} stamp`} />
          </div>
          <div className="pc-place">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.imageUrl} alt="" className="pc-stamp" />
            <span className="pc-name">{place.name}</span>
            {r && r.stars > 0 && <span className="pc-stars"><Stars stars={r.stars} size={100} /><span>{r.stars} eco star{r.stars === 1 ? "" : "s"}</span></span>}
            <span className="pc-arrow">Scan me</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- printed, so no lazy loading or resizing */}
          <img src="/landing/bee.webp" alt="" className="pc-bee" />
        </div>

        <ol className="pc-steps">
          {steps.map(([title, text], i) => (
            <li key={title}><span className="pc-n">{i + 1}</span><span><b>{title}</b>{/^[a-z]/.test(text) ? " " : ". "}{text}</span></li>
          ))}
        </ol>

        <p className="pc-foot"><span>Every stamp is recorded on Solana.</span><b>ecoproofai.com</b></p>
      </div>
    </div>
  );

  const tab = (on: boolean) => `rounded-full px-3 py-1.5 text-xs font-bold ${on ? "bg-sage-500 text-cream" : "text-sage-900"}`;
  return (
    <div className={`${journalFonts} lg:mx-auto lg:max-w-[720px]`}>
      <style>{CSS}</style>
      <div className="no-print mb-4 space-y-3">
        <div>
          <h1 className="text-[22px] leading-tight">Your postcard</h1>
          <p className="text-[13px] text-sage-900">Put it on the counter or the tables. It tells customers what EcoProof AI is, so they know why to scan.</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="glass flex rounded-full p-1" role="group" aria-label="Print size">
            <Link href={`/place/${place.id}`} replace scroll={false} aria-current={!poster} className={tab(!poster)}>4 postcards (A6)</Link>
            <Link href={`/place/${place.id}?size=a4`} replace scroll={false} aria-current={poster} className={tab(poster)}>1 poster (A4)</Link>
          </div>
          <PrintButton />
        </div>
        <p className="text-[12px] leading-snug text-sage-900">
          {poster ? "One poster fills an A4 sheet." : "One A4 sheet gives four postcards: cut it once across and once down."} In the print dialog choose A4, margins
          &ldquo;None&rdquo; and turn on &ldquo;Background graphics&rdquo;. Thick paper (200 g or more) stands up best.
        </p>
      </div>
      <div className={`sheet ${poster ? "sheet-a4" : "sheet-a6"}`}>
        {card}
        {!poster && <>{card}{card}{card}</>}
      </div>
    </div>
  );
}

// The postcard. Colours are the landing's paper tokens (app/globals.css); the card is white so it costs little ink.
const CSS = `
.sheet { max-width: 420px; margin: 0 auto; }
.sheet > .pc + .pc { display: none; }
.pc { container-type: inline-size; aspect-ratio: 105 / 148.5; background: #fff; color: var(--color-cocoa); border-radius: 18px; box-shadow: 0 10px 30px rgba(58, 42, 28, 0.18); overflow: hidden;
  font-family: var(--font-nunito), system-ui, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pc-in { height: 100%; padding: 5.4cqw 7.5cqw 5.5cqw; display: flex; flex-direction: column; border-top: 2.6cqw solid var(--color-honey); }
.pc-top { display: flex; align-items: center; justify-content: space-between; }
.pc-brand { display: inline-flex; align-items: center; gap: 2cqw; font-family: var(--font-caprasimo), serif; font-size: 4.6cqw; line-height: 1; }
.pc-brand b { font-weight: 400; color: var(--color-terracotta-ink); }
.pc-tile { display: inline-flex; align-items: center; justify-content: center; width: 7cqw; height: 7cqw; border-radius: 2cqw; }
.pc-tile svg { width: 62%; height: 62%; }
.pc-mark { font-family: var(--font-bebas), Impact, sans-serif; font-size: 3.4cqw; letter-spacing: 0.1em; text-transform: uppercase; line-height: 1; color: var(--color-terracotta-ink);
  border: 0.5cqw solid currentColor; border-radius: 999px; padding: 1.2cqw 2.8cqw 0.9cqw; rotate: -4deg; }
.pc-h { margin-top: 4.5cqw; font-family: var(--font-fraunces), Georgia, serif; font-weight: 700; font-size: 8.8cqw; line-height: 1.04; letter-spacing: -0.015em; text-wrap: balance; }
.pc-lead { margin-top: 2.5cqw; font-size: 3.6cqw; line-height: 1.36; text-wrap: pretty; }
.pc-scan { position: relative; margin-top: 4.5cqw; display: flex; align-items: center; gap: 4.5cqw; }
.pc-qr { flex: none; width: 37cqw; padding: 2.3cqw; border: 0.7cqw solid var(--color-cocoa); border-radius: 3.6cqw; background: #fff; }
.pc-qr img { display: block; width: 100%; height: auto; }
.pc-bee { position: absolute; width: 21cqw; right: -1.5cqw; bottom: -2cqw; rotate: 6deg; }
.pc-place { min-width: 0; flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 1.5cqw; }
.pc-stamp { width: 14cqw; height: 14cqw; }
.pc-name { max-width: 26cqw; font-family: var(--font-fraunces), Georgia, serif; font-weight: 700; font-size: 4.4cqw; line-height: 1.1; overflow-wrap: anywhere; }
.pc-stars { display: inline-flex; align-items: center; gap: 1.2cqw; font-size: 2.9cqw; font-weight: 800; }
.pc-stars svg { width: 3.4cqw; height: 3.4cqw; }
.pc-arrow { font-family: var(--font-bebas), Impact, sans-serif; font-size: 4cqw; letter-spacing: 0.1em; text-transform: uppercase; line-height: 1; color: #fff; background: var(--color-cocoa);
  border-radius: 999px; padding: 1.4cqw 3cqw 1cqw; }
.pc-steps { margin-top: auto; padding-top: 4cqw; display: grid; gap: 1.8cqw; font-size: 3.2cqw; line-height: 1.3; }
.pc-steps li { display: flex; gap: 2.4cqw; align-items: flex-start; text-wrap: pretty; }
.pc-n { flex: none; width: 5.8cqw; height: 5.8cqw; border-radius: 999px; background: var(--color-honey); color: var(--color-cocoa); font-weight: 900; font-size: 3.4cqw; display: inline-flex; align-items: center; justify-content: center; }
.pc-foot { margin-top: 3cqw; padding-top: 2.5cqw; border-top: 0.35cqw dashed rgba(58, 42, 28, 0.4); display: flex; justify-content: space-between; align-items: baseline; gap: 4cqw; font-size: 2.8cqw; line-height: 1.3; white-space: nowrap; }
.pc-foot b { flex: none; font-family: var(--font-caprasimo), serif; font-weight: 400; font-size: 3.8cqw; }
@page { size: A4 portrait; margin: 0; }
@media print {
  nav, header, .no-print { display: none !important; }
  html, body { background: #fff !important; }
  main { max-width: none !important; padding: 0 !important; margin: 0 !important; }
  .sheet { max-width: none; margin: 0; width: 210mm; height: 296mm; overflow: hidden; display: grid; }
  .sheet-a6 { grid-template-columns: 105mm 105mm; grid-template-rows: 148mm 148mm; }
  .sheet > .pc, .sheet > .pc + .pc { display: block; aspect-ratio: auto; width: 100%; height: 100%; border-radius: 0; box-shadow: none; }
  .sheet-a6 > .pc { outline: 0.2mm dashed rgba(58, 42, 28, 0.35); }
}
`;
