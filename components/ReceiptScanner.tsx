"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Check, Loader2, ReceiptText, X } from "lucide-react";
import ProgressSteps, { type ProgressStep as Step } from "@/components/ProgressSteps";
import { getUserId } from "@/lib/clientUser";
import { readProgress } from "@/lib/progress";
import type { ReceiptReview } from "@/lib/receipts";

/**
 * The receipt door (2026-11-15): photograph a receipt IN an eco shop, see what EcoProof AI read and what it counts, collect a
 * verified stamp. Two calls: POST /api/receipts/read (photo + position → a review with a signed token), then POST /api/claims
 * { receiptToken } like every other door. The photo is downsized here and never stored anywhere.
 */

type Result = { stamp: { signature: string | null; claimUrl: string | null; impactNote: string | null; stampClass: "verified" | "presence"; points: number; placeName: string }; passport: { stamps: number; points: number; nextMilestone: number }; nfts: { milestone: number; tier: string; status: string; id: string }[] };
type Phase = "idle" | "reading" | "review" | "claiming" | "done";

const STEPS: Step[] = [
  { key: "verify", label: "Checking your receipt and your location" },
  { key: "anchor", label: "Writing the proof to Solana", hint: "Our public ledger. This is the slow part, usually 5–20 seconds." },
  { key: "save", label: "Saving it to your passport" },
  { key: "passport", label: "Updating your progress" },
];
const NFT_STEP: Step = { key: "nft", label: "Minting your Bee Guardian NFT", hint: "A soulbound NFT, just for you. A few more seconds." };

function position(): Promise<{ lat: number; lng: number }> {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error("This device can't share its location."));
    navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => rej(new Error("Location permission is needed: receipts are scanned in the shop.")), { enableHighAccuracy: true, timeout: 15000 });
  });
}

/** The photo as a JPEG no wider than 1600px: enough to read a till receipt, small enough to send from a shop's Wi-Fi. */
async function shrink(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.82).replace(/^data:[^,]*,/, "");
}

export default function ReceiptScanner({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [note, setNote] = useState("");          // what the reader is doing right now
  const [err, setErr] = useState<{ message: string; noShop?: boolean; retake?: boolean } | null>(null);
  const [review, setReview] = useState<ReceiptReview | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [steps, setSteps] = useState<Step[]>(STEPS);
  const [current, setCurrent] = useState<string | null>(null);
  const [done, setDone] = useState<Result | null>(null);

  async function read(f: File | undefined) {
    if (!f) return;
    setErr(null); setReview(null); setPhase("reading");
    try {
      setNote("Checking you're in the shop…");
      const pos = await position();
      setGeo(pos);
      setNote("Reading your receipt…");
      const image = await shrink(f);
      const r = await fetch("/api/receipts/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image, mediaType: "image/jpeg", userId: getUserId(), ...pos }) });
      const j = (await r.json().catch(() => ({}))) as ReceiptReview & { error?: string; noShop?: boolean; noShopNearby?: boolean; retake?: boolean };
      if (!r.ok) throw Object.assign(new Error(j.error || "We couldn't read that receipt."), { noShop: !!(j.noShop || j.noShopNearby), retake: !!j.retake });
      setReview(j); setPhase("review");
    } catch (e) {
      const x = e as Error & { noShop?: boolean; retake?: boolean };
      setErr({ message: x.message || "Failed", noShop: x.noShop, retake: x.retake }); setPhase("idle");
    }
    if (file.current) file.current.value = "";
  }

  async function claim() {
    if (!review) return;
    setErr(null); setPhase("claiming"); setSteps(STEPS); setCurrent(null);
    try {
      const pos = geo ?? (await position());
      const r = await fetch("/api/claims", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" }, body: JSON.stringify({ receiptToken: review.token, userId: getUserId(), ...pos }) });
      const result = await readProgress<Result>(r, (step) => { if (step === "nft") setSteps([...STEPS, NFT_STEP]); setCurrent(step); })
        .catch((e: Error) => { throw e.message.startsWith("The connection dropped") ? new Error("The connection dropped. Check your passport: your stamp may already be saved.") : e; });
      setDone(result); setPhase("done");
    } catch (e) { setErr({ message: e instanceof Error ? e.message : "Failed" }); setPhase("review"); }
  }

  const before = done ? done.passport.points - done.stamp.points : 0;
  const newNfts = done ? done.nfts.filter((n) => n.milestone > before && n.milestone <= done.passport.points) : [];

  return (
    <div className="fixed inset-0 z-[6000] flex flex-col bg-black/90 text-cream" role="dialog" aria-modal="true" aria-label="Scan a receipt">
      <div className="flex items-center justify-between p-4">
        <span className="flex items-center gap-2 font-heading text-lg"><ReceiptText size={20} /> Scan a receipt</span>
        <button onClick={onClose} className="rounded-full bg-white/10 p-2" aria-label="Close"><X size={20} /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="mx-auto max-w-md space-y-4">
          {phase === "idle" && (
            <>
              <p className="text-[15px] leading-relaxed text-cream/90">Bought something plastic-free in an eco shop that&apos;s on EcoProof AI? Photograph the receipt <b>while you&apos;re in the shop</b> and it becomes a verified purchase: 5 points, with the real impact of what you bought.</p>
              <ul className="list-disc space-y-1 pl-5 text-[13.5px] text-cream/75">
                <li>Lay the receipt flat, whole receipt in the frame, good light.</li>
                <li>Receipts up to 7 days old. Each receipt works once.</li>
                <li>We keep the items and their impact, never the photo.</li>
              </ul>
              <input ref={file} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => read(e.target.files?.[0])} />
              <button onClick={() => file.current?.click()} className="lift flex w-full items-center justify-center gap-2 rounded-full bg-honey-500 py-3.5 text-base font-bold text-ink"><Camera size={18} strokeWidth={2.5} /> Take a photo of the receipt</button>
              {err && (
                <div className="space-y-2 rounded-2xl bg-terra-100 p-3 text-sm text-terra-800">
                  <p>{err.message}</p>
                  {err.noShop && <p className="text-[13px]">Know the shop? <Link href="/about#help" className="font-bold underline" onClick={onClose}>Ask them to join EcoProof AI</Link>.</p>}
                </div>
              )}
            </>
          )}
          {phase === "reading" && (
            <p className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 text-sm font-semibold"><Loader2 size={18} className="animate-spin text-honey-500" /> {note}</p>
          )}
          {(phase === "review" || phase === "claiming") && review && (
            <div className="space-y-3 rounded-[28px] bg-white p-4 text-ink">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-honey-700">We read</p>
                <p className="font-heading text-xl leading-tight">{review.placeName}</p>
                <p className="text-[12.5px] text-ink/70">{review.date}{review.total ? ` · ${review.total.toFixed(2)} ${review.currency}` : ""}{review.receiptNumber ? ` · no. ${review.receiptNumber}` : ""}</p>
              </div>
              <ul className="divide-y divide-ink/10 text-[13.5px]">
                {review.items.map((it, i) => (
                  <li key={i} className={`flex items-baseline justify-between gap-3 py-1.5 ${it.counts ? "" : "text-ink/50"}`}>
                    <span className="min-w-0 flex-1"><span className="font-semibold">{it.quantity > 1 ? `${it.quantity} × ` : ""}{it.name}</span></span>
                    <span className="shrink-0 text-[11.5px] font-semibold uppercase tracking-wider text-sage-800">{it.counts ? it.label : "not counted"}</span>
                  </li>
                ))}
              </ul>
              <p className="rounded-xl bg-honey-300/40 p-2.5 text-sm font-semibold">{review.line}</p>
              <p className="text-[11.5px] leading-relaxed text-ink/60">{review.estimate ? "The impact is EcoProof AI's estimate for these items; the shop hasn't confirmed them yet. " : "Impact confirmed by the shop. "}Something wrong? Take the photo again.</p>
              {phase === "review" ? (
                <div className="space-y-2">
                  <button onClick={claim} className="lift w-full rounded-full bg-terra-500 py-3.5 text-base font-bold text-cream">Collect my stamp · +{review.points} points</button>
                  <button onClick={() => { setReview(null); setPhase("idle"); }} className="w-full rounded-full border border-ink/15 py-2.5 text-sm font-bold">Take the photo again</button>
                  {err && <p className="rounded-xl bg-terra-100 p-3 text-sm text-terra-800">{err.message}</p>}
                </div>
              ) : (
                <div className="rounded-2xl bg-cream p-3 ring-1 ring-sage-300"><ProgressSteps steps={steps} current={current} /></div>
              )}
            </div>
          )}
          {phase === "done" && done && (
            <div className="space-y-3 rounded-[28px] bg-white p-5 text-center text-ink ring-2 ring-honey-400 shadow-[0_10px_34px_rgba(232,163,23,0.35)]">
              <span className="inline-flex items-center gap-1 rounded-full bg-honey-300 px-3 py-1 text-xs font-extrabold"><Check size={14} strokeWidth={3.2} /> Verified purchase</span>
              <p className="font-heading text-xl">Stamp collected! ✨</p>
              {done.stamp.impactNote && <p className="rounded-xl bg-honey-300/40 p-2.5 text-sm font-semibold">{done.stamp.impactNote}</p>}
              <p className="text-sm text-neutral-600"><b className="text-ink">+{done.stamp.points} points</b> · {done.passport.points} in total · next rank at {done.passport.nextMilestone}</p>
              {newNfts.length > 0 && <p className="rounded-xl bg-sage-100 p-3 text-sm font-semibold text-sage-800">New Bee Guardian NFT{newNfts.length > 1 ? "s" : ""}: {newNfts.map((n) => n.tier).join(" + ")}</p>}
              {done.stamp.claimUrl && <a className="block text-xs text-sage-700 underline" href={done.stamp.claimUrl} target="_blank" rel="noreferrer">See the proof on Solana ↗</a>}
              <button onClick={() => { onClose(); router.push("/passport"); router.refresh(); }} className="lift block w-full rounded-full bg-sage-500 py-3 font-bold text-cream">View my passport</button>
            </div>
          )}
          <p className="text-center text-[11px] text-cream/50">Only verified purchases carry an impact number. Each receipt is anchored on Solana.</p>
        </div>
      </div>
    </div>
  );
}
