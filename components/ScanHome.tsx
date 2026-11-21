"use client";
import { useState } from "react";
import { Camera, ReceiptText } from "lucide-react";
import QrScanner from "@/components/QrScanner";
import ReceiptScanner from "@/components/ReceiptScanner";
import { POINTS_BY_KIND, POINTS_CARD, POINTS_VERIFIED, pointsLabel } from "@/lib/stampClasses";

/** The Scan tab's page: one big button per camera door. The QR scanner follows any EcoProof code (a place's QR, a parcel card, an order
 *  link); the receipt scanner is the in-shop receipt door. Both open over the page and close back to it. */
export default function ScanHome() {
  const [open, setOpen] = useState<"qr" | "receipt" | null>(null);
  const door = "glass lift flex w-full items-center gap-4 rounded-[28px] p-5 text-left";
  const icon = "flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-honey-500 text-ink";
  return (
    <div className="space-y-4 lg:mx-auto lg:max-w-[720px]">
      <div className="passport-bg fixed inset-0 -z-10" aria-hidden />
      <header>
        <h1 className="text-[26px] leading-tight lg:text-[32px]">Scan</h1>
        <p className="text-[13.5px] text-sage-900">Collect a stamp with your camera. No app to install.</p>
      </header>
      <button type="button" onClick={() => setOpen("qr")} className={door}>
        <span className={icon}><Camera size={26} strokeWidth={2.4} aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-[18px] leading-tight">Scan a QR code</span>
          <span className="block text-[12.5px] leading-snug text-sage-900">At a café, restaurant, hotel or eco shop ({pointsLabel(POINTS_BY_KIND.cafe)} a visit, once a day), or the card in your parcel ({pointsLabel(POINTS_CARD)}).</span>
        </span>
      </button>
      <button type="button" onClick={() => setOpen("receipt")} className={door}>
        <span className={icon}><ReceiptText size={26} strokeWidth={2.4} aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-[18px] leading-tight">Photograph a receipt</span>
          <span className="block text-[12.5px] leading-snug text-sage-900">From an eco shop, while you are still in the shop: a verified purchase, {pointsLabel(POINTS_VERIFIED)}, with what you avoided.</span>
        </span>
      </button>
      <p className="hidden text-[12px] text-sage-900 lg:block">On a computer? Scan with your phone&apos;s camera, or use a webcam here.</p>
      <p className="text-[12px] text-sage-900">An online order needs no scan: tap the button in your order email.</p>
      {open === "qr" && <QrScanner onClose={() => setOpen(null)} />}
      {open === "receipt" && <ReceiptScanner onClose={() => setOpen(null)} />}
    </div>
  );
}
