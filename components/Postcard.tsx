import { LeafMark } from "@/components/Logo";
import Stars from "@/components/Stars";
import { SAGE } from "@/lib/brand";

// The printed cards that explain EcoProof next to a claim QR. Postcard: a place's card for the counter (app/(app)/place/[id], and the
// "set up" screen of /join), A6 or an A4 poster. ParcelCard: the card an online shop puts in its parcels (app/(app)/place/[id]/cards),
// the size of a business card, because a green shop should not add more paper to a parcel than it must (Pola, 2026-11-18). Every measure
// inside is in cqw (1% of the card's width), so a card prints at any size. The cards have a fixed height: new text must fit, check the
// print PDF. The QR for print comes from lib/qrImage.ts.

/** What the customer did here, in the counter postcard's headline: "Collect an eco stamp for your stay". */
const HERE: Record<string, string> = { cafe: "visit", restaurant: "meal", hotel: "stay", eco_shop: "visit" };

/** The counter postcard of a place: what EcoProof is, why to scan, and the claim QR. `qr` is the QR image's address. */
export function counterCard(place: { name: string; kind: string; imageUrl: string; requiresGps: boolean }, qr: string, stars?: number): PostcardProps {
  return {
    mark: "Eco passport",
    headline: `Collect an eco stamp for your ${HERE[place.kind] ?? "visit"}`,
    place: { name: place.name, imageUrl: place.imageUrl, stars },
    qr,
    steps: [
      ["Scan the code", "with your phone's camera. No app to install, no sign-up."],
      ["Get your stamp", place.requiresGps ? "in your free eco passport. One a day, and we check you're really here." : "in your free eco passport. You can collect one a day here."],
      ["Meet your Bee Guardian", "Your first stamp unlocks it, and it levels up as you visit more eco places."],
    ],
  };
}

export type PostcardProps = {
  /** The pill in the top corner, e.g. "Eco passport". */
  mark: string;
  headline: string;
  place: { name: string; imageUrl: string; stars?: number };
  qr: string;
  /** Under "Scan me": the code to type when the QR can't be scanned. */
  code?: string;
  /** Three steps: a bold start and the rest of the sentence (a lower-case rest continues the bold words). */
  steps: [string, string][];
};

export default function Postcard({ mark, headline, place, qr, code, steps }: PostcardProps) {
  return (
    <div className="pc">
      <div className="pc-in">
        <div className="pc-top">
          <span className="pc-brand">
            <span className="pc-tile" style={{ background: SAGE }}><LeafMark size={100} /></span>
            <span>EcoProof</span>
          </span>
          <span className="pc-mark">{mark}</span>
        </div>

        <p className="pc-h">{headline}</p>
        {place.stars ? <>
          {/* The lead gives way to this box (the card's height is fixed); the steps still say what the passport is. Why to trust the place itself (Pola, 2026-11-18: the card must say the place is eco by EcoProof's measure): the stars are EcoProof's rating (lib/stars.ts) of the practices the place published and anchored (lib/declarations.ts). The practices are self-declared and nobody inspects them, so "rated", never "approved", "certified" or "verified". */}
          <p className="pc-proof">
            <span className="pc-seal" style={{ background: SAGE }}><LeafMark size={100} /></span>
            <span>
              <span className="pc-rated">Rated by EcoProof: {place.stars} eco star{place.stars === 1 ? "" : "s"} <span className="pc-stars"><Stars stars={place.stars} size={100} /></span></span>
              For the eco practices {place.name} has published and locked on Solana.
            </span>
          </p>
        </> : <p className="pc-lead">EcoProof is the passport for people who choose places that cut plastic and waste. <b>{place.name}</b> is one of them.</p>}

        <div className="pc-scan">
          <div className="pc-qr">
            {/* eslint-disable-next-line @next/next/no-img-element -- an inline SVG */}
            <img src={qr} alt={`QR code: collect your ${place.name} stamp`} />
          </div>
          <div className="pc-place">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={place.imageUrl} alt="" className="pc-stamp" />
            <span className="pc-name">{place.name}</span>
            <span className="pc-arrow">Scan me</span>
            {code && <span className="pc-code">{code}</span>}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- printed, so no lazy loading or resizing */}
          <img src="/landing/bee.webp" alt="" className="pc-bee" />
        </div>

        <ol className="pc-steps">
          {steps.map(([title, text], i) => (
            <li key={title}><span className="pc-n">{i + 1}</span><span><b>{title}</b>{/^[a-z]/.test(text) ? " " : ". "}{text}</span></li>
          ))}
        </ol>

        <p className="pc-foot"><span>Every stamp is recorded on Solana.</span><b>ecoproof.app</b></p>
      </div>
    </div>
  );
}

/**
 * The styles of the card, its screen preview (the first card of the first sheet) and the print sheets. `cols` x `rows` cards fill one
 * A4 page edge to edge, so the cuts are straight lines: 2 x 2 portrait = A6, 4 x 2 landscape = A7, 1 x 1 = an A4 poster.
 * Colours are the landing's paper tokens (app/globals.css); the card is white so it costs little ink.
 */
export function postcardCss({ cols, rows, landscape = false }: { cols: number; rows: number; landscape?: boolean }): string {
  const [w, h] = landscape ? [297, 210] : [210, 297];
  return `
.sheet { max-width: 420px; margin: 0 auto; }
.sheet + .sheet, .sheet > .pc + .pc { display: none; }
.pc { container-type: inline-size; aspect-ratio: 105 / 148.5; background: #fff; color: var(--color-cocoa); border-radius: 18px; box-shadow: 0 10px 30px rgba(58, 42, 28, 0.18); overflow: hidden;
  font-family: var(--font-nunito), system-ui, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pc-in { height: 100%; padding: 5.4cqw 7.5cqw 5.5cqw; display: flex; flex-direction: column; border-top: 2.6cqw solid var(--color-honey); }
.pc-top { display: flex; align-items: center; justify-content: space-between; }
.pc-brand { display: inline-flex; align-items: center; gap: 2cqw; font-family: var(--font-caprasimo), serif; font-size: 4.6cqw; line-height: 1; }
.pc-tile { display: inline-flex; align-items: center; justify-content: center; width: 7cqw; height: 7cqw; border-radius: 2cqw; }
.pc-tile svg { width: 62%; height: 62%; }
.pc-mark { font-family: var(--font-bebas), Impact, sans-serif; font-size: 3.4cqw; letter-spacing: 0.1em; text-transform: uppercase; line-height: 1; color: var(--color-terracotta-ink);
  border: 0.5cqw solid currentColor; border-radius: 999px; padding: 1.2cqw 2.8cqw 0.9cqw; rotate: -4deg; }
.pc-h { margin-top: 4cqw; font-family: var(--font-fraunces), Georgia, serif; font-weight: 700; font-size: 8.8cqw; line-height: 1.04; letter-spacing: -0.015em; text-wrap: balance; }
.pc-lead { margin-top: 2.5cqw; font-size: 3.6cqw; line-height: 1.36; text-wrap: pretty; }
.pc-scan { position: relative; margin-top: 3.5cqw; display: flex; align-items: center; gap: 4.5cqw; }
.pc-qr { flex: none; width: 35cqw; padding: 2.3cqw; border: 0.7cqw solid var(--color-cocoa); border-radius: 3.6cqw; background: #fff; }
.pc-qr img { display: block; width: 100%; height: auto; }
.pc-bee { position: absolute; width: 21cqw; right: -1.5cqw; bottom: -2cqw; rotate: 6deg; }
.pc-place { min-width: 0; flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 1.5cqw; }
.pc-stamp { width: 14cqw; height: 14cqw; }
.pc-name { max-width: 26cqw; font-family: var(--font-fraunces), Georgia, serif; font-weight: 700; font-size: 4.4cqw; line-height: 1.1; overflow-wrap: anywhere; }
.pc-proof { margin-top: 3cqw; padding: 2.2cqw 2.8cqw; display: flex; gap: 2.4cqw; align-items: center; border-radius: 2.6cqw; background: rgba(143, 163, 114, 0.2); font-size: 3.05cqw; line-height: 1.3; text-wrap: pretty; }
.pc-seal { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 8cqw; height: 8cqw; border-radius: 999px; }
.pc-seal svg { width: 60%; height: 60%; }
.pc-rated { display: block; margin-bottom: 0.5cqw; font-family: var(--font-fraunces), Georgia, serif; font-weight: 700; font-size: 3.5cqw; line-height: 1.15; white-space: nowrap; }
.pc-stars { display: inline-flex; vertical-align: -0.3cqw; }
.pc-stars svg { width: 3.3cqw; height: 3.3cqw; }
.pc-arrow { font-family: var(--font-bebas), Impact, sans-serif; font-size: 4cqw; letter-spacing: 0.1em; text-transform: uppercase; line-height: 1; color: #fff; background: var(--color-cocoa);
  border-radius: 999px; padding: 1.4cqw 3cqw 1cqw; }
.pc-steps { margin-top: auto; padding-top: 3cqw; display: grid; gap: 1.8cqw; font-size: 3.2cqw; line-height: 1.3; }
.pc-steps li { display: flex; gap: 2.4cqw; align-items: flex-start; text-wrap: pretty; }
.pc-n { flex: none; width: 5.8cqw; height: 5.8cqw; border-radius: 999px; background: var(--color-honey); color: var(--color-cocoa); font-weight: 900; font-size: 3.4cqw; display: inline-flex; align-items: center; justify-content: center; }
.pc-foot { margin-top: 2.5cqw; padding-top: 2.5cqw; border-top: 0.35cqw dashed rgba(58, 42, 28, 0.4); display: flex; justify-content: space-between; align-items: baseline; gap: 4cqw; font-size: 2.8cqw; line-height: 1.3; white-space: nowrap; }
.pc-foot b { flex: none; font-family: var(--font-caprasimo), serif; font-weight: 400; font-size: 3.8cqw; }
.pc-code { font-family: ui-monospace, monospace; font-size: 2.9cqw; letter-spacing: 0.08em; font-weight: 700; }
@page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 0; }
@media print {
  nav, header, .no-print { display: none !important; }
  html, body { background: #fff !important; }
  main { max-width: none !important; padding: 0 !important; margin: 0 !important; }
  .sheet, .sheet + .sheet { max-width: none; margin: 0; width: ${w}mm; height: ${h - 1}mm; overflow: hidden; display: grid; break-after: page;
    grid-template-columns: repeat(${cols}, ${w / cols}mm); grid-template-rows: repeat(${rows}, ${(h - 1) / rows}mm); }
  .sheet:last-child { break-after: auto; }
  .sheet > .pc, .sheet > .pc + .pc { display: block; aspect-ratio: auto; width: 100%; height: 100%; border-radius: 0; box-shadow: none; ${cols * rows > 1 ? "outline: 0.2mm dashed rgba(58, 42, 28, 0.35);" : ""} }
}
`;
}

/** The card in a parcel: business-card size (85 x 55 mm), so only the facts that matter: what it is, whose it is, how to scan, the code and the bee. */
export function ParcelCard({ place, qr, code }: { place: string; qr: string; code: string }) {
  return (
    <div className="bc">
      <div className="bc-in">
        <div className="bc-left">
          <div className="bc-qr">
            {/* eslint-disable-next-line @next/next/no-img-element -- an inline SVG */}
            <img src={qr} alt={`QR code: collect your ${place} stamp`} />
          </div>
          <span className="bc-code">{code}</span>
        </div>
        <div className="bc-right">
          <span className="bc-brand">
            <span className="bc-tile" style={{ background: SAGE }}><LeafMark size={100} /></span>
            <span>EcoProof</span>
          </span>
          <p className="bc-h">Your order earns an eco stamp</p>
          <p className="bc-lead">A thank-you from <b>{place}</b>. Scan with your phone: no app, no sign-up.</p>
          <p className="bc-foot"><b>ecoproof.app</b><span>Works once</span></p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- printed, so no lazy loading or resizing */}
        <img src="/landing/bee.webp" alt="" className="bc-bee" />
      </div>
    </div>
  );
}

/** The styles of the parcel card, its screen preview (the first card) and the print sheets: ten cards of 85 x 55 mm on an A4 page,
 *  two across and five down, centred, with dashed cut lines. */
export function parcelCardCss(): string {
  return `
.sheet { max-width: 420px; margin: 0 auto; }
.sheet + .sheet, .sheet > .bc + .bc { display: none; }
.bc { container-type: inline-size; aspect-ratio: 85 / 55; background: #fff; color: var(--color-cocoa); border-radius: 12px; box-shadow: 0 10px 30px rgba(58, 42, 28, 0.18); overflow: hidden;
  font-family: var(--font-nunito), system-ui, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.bc-in { position: relative; height: 100%; padding: 4.6cqw 5.5cqw 4.6cqw; display: flex; gap: 5cqw; border-top: 2.4cqw solid var(--color-honey); }
.bc-left { flex: none; width: 36cqw; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2cqw; }
.bc-qr { width: 100%; padding: 2cqw; border: 0.7cqw solid var(--color-cocoa); border-radius: 3cqw; background: #fff; }
.bc-qr img { display: block; width: 100%; height: auto; }
.bc-code { font-family: ui-monospace, monospace; font-size: 3.3cqw; letter-spacing: 0.08em; font-weight: 700; line-height: 1; }
.bc-right { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.bc-brand { display: inline-flex; align-items: center; gap: 1.8cqw; font-family: var(--font-caprasimo), serif; font-size: 5cqw; line-height: 1; }
.bc-tile { display: inline-flex; align-items: center; justify-content: center; width: 7cqw; height: 7cqw; border-radius: 2cqw; }
.bc-tile svg { width: 62%; height: 62%; }
.bc-h { margin-top: 3.2cqw; font-family: var(--font-fraunces), Georgia, serif; font-weight: 700; font-size: 7.2cqw; line-height: 1.04; letter-spacing: -0.015em; text-wrap: balance; }
.bc-lead { margin-top: 2.4cqw; font-size: 3.5cqw; line-height: 1.3; text-wrap: pretty; }
.bc-lead b { overflow-wrap: anywhere; }
.bc-foot { margin-top: auto; display: flex; justify-content: space-between; align-items: baseline; gap: 2cqw; font-size: 3.2cqw; line-height: 1; font-weight: 700; white-space: nowrap; }
.bc-foot b { font-family: var(--font-caprasimo), serif; font-weight: 400; font-size: 4.4cqw; }
.bc-bee { position: absolute; width: 16cqw; right: 3cqw; top: 1cqw; rotate: 6deg; }
@page { size: A4 portrait; margin: 0; }
@media print {
  nav, header, .no-print { display: none !important; }
  html, body { background: #fff !important; }
  main { max-width: none !important; padding: 0 !important; margin: 0 !important; }
  .sheet, .sheet + .sheet { max-width: none; margin: 0; width: 210mm; height: 296mm; overflow: hidden; display: grid; break-after: page;
    grid-template-columns: repeat(2, 85mm); grid-auto-rows: 55mm; justify-content: center; align-content: start; padding-top: 10.5mm; }
  .sheet:last-child { break-after: auto; }
  .sheet > .bc, .sheet > .bc + .bc { display: block; aspect-ratio: auto; width: 100%; height: 100%; border-radius: 0; box-shadow: none; outline: 0.2mm dashed rgba(58, 42, 28, 0.35); }
}
`;
}
