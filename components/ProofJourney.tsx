"use client";
import Link from "next/link";
import { Check, Circle, Loader2, Lock, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

export type JItem = { name: string; quantity: number; category: string };
export type Journey = {
  extracted?: { merchant: string; receiptNumber: string; date: string; total: number; items: JItem[]; sample: boolean };
  impact?: { co2Kg: number; plasticItems: number; packagingG: number; sustainableItems: number };
  hash?: string;
  anchoring?: boolean;
  anchor?: { signature: string; claimAddress: string | null; claimUrl: string | null } | "pending";
  done?: { id: string };
  passport?: { dCo2: number; dPlastic: number; dPack: number; streak: number };
  error?: { message: string; claimUrl?: string | null };
};

const short = (s: string) => `${s.slice(0, 6)}…${s.slice(-6)}`;
const txUrl = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
type State = "done" | "active" | "waiting" | "pending";

function Row({ state, title, last = false, children }: { state: State; title: string; last?: boolean; children?: ReactNode }) {
  const dot =
    state === "done" ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sage-500"><Check size={14} strokeWidth={3} className="text-cream" /></span>
    : state === "active" ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-terra-100"><Loader2 size={14} strokeWidth={3} className="animate-spin text-terra-600" /></span>
    : state === "pending" ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-terra-100"><Circle size={12} strokeWidth={3} className="text-terra-600" /></span>
    : <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-neutral-300" />;
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        {dot}
        {!last && <span className={`mt-1 w-0.5 flex-1 ${state === "done" ? "bg-sage-300" : "bg-neutral-200"}`} />}
      </div>
      <div className={`min-w-0 flex-1 pb-4 ${state === "waiting" ? "opacity-50" : ""}`}>
        <p className="font-heading text-[14px] leading-6 text-ink">{title}</p>
        {children && <div className="mt-0.5 text-[13px] text-neutral-700">{children}</div>}
      </div>
    </li>
  );
}

export default function ProofJourney({ j, running, onRetryAnchor, retrying, onAgain, onViewPassport }: {
  j: Journey; running: boolean; onRetryAnchor: () => void; retrying: boolean; onAgain?: () => void; onViewPassport: () => void;
}) {
  const ex = j.extracted;
  const anchoredState: State = j.anchor && j.anchor !== "pending" ? "done" : j.anchor === "pending" ? "pending" : j.anchoring ? "active" : "waiting";
  const stop = !!j.error;
  const wait = (s: State): State => (stop && s !== "done" ? "waiting" : s);
  const sustainable = ex ? ex.items.filter((i) => i.category !== "not_sustainable").length : 0;

  return (
    <section className="rounded-[28px] bg-neutral-100 p-4">
      <h2 className="mb-3 text-[15px]">Your proof, step by step</h2>
      <ol>
        <Row state={ex ? "done" : stop ? "waiting" : "active"} title="Receipt scanned">
          {ex && <>
            {ex.merchant}{ex.date ? ` · ${ex.date}` : ""}{ex.receiptNumber ? ` · #${ex.receiptNumber}` : ""}{ex.total ? ` · ${ex.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ""}
            {ex.sample && <span className="mt-1 block rounded-lg bg-terra-100 px-2 py-1 text-xs text-terra-800">The AI service was unavailable, so this demo used a sample extraction.</span>}
          </>}
        </Row>
        <Row state={ex ? "done" : "waiting"} title={ex ? `AI found ${ex.items.length} item${ex.items.length === 1 ? "" : "s"} · ${sustainable} sustainable` : "Items identified by AI"}>
          {ex && (
            <ul className="mt-1 space-y-1">
              {ex.items.map((i, k) => (
                <li key={k} className="flex justify-between gap-3 border-b border-neutral-200 pb-1 text-[13px]">
                  <span>{i.quantity}× {i.name}</span>
                  <span className={i.category === "not_sustainable" ? "shrink-0 text-neutral-400" : "shrink-0 text-sage-700"}>
                    {i.category === "not_sustainable" ? "not counted" : "✓ " + i.category.replace(/_/g, " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Row>
        <Row state={j.impact ? "done" : ex && !stop ? "active" : "waiting"} title="Impact calculated">
          {j.impact && <span className="font-semibold text-sage-700">+{j.impact.co2Kg} kg CO₂ · +{j.impact.plasticItems} plastics avoided · +{j.impact.packagingG} g packaging</span>}
        </Row>
        <Row state={j.hash ? "done" : j.impact && !stop ? "active" : "waiting"} title="Proof created">
          {j.hash && <span className="break-all font-mono text-[11px] text-neutral-600">sha256 {j.hash.slice(0, 32)}…</span>}
        </Row>
        <Row state={wait(anchoredState)} title={anchoredState === "pending" ? "Saved. Waiting for Solana" : "Anchored on Solana"}>
          {j.anchor && j.anchor !== "pending" && (
            <span className="space-y-1.5">
              <a href={txUrl(j.anchor.signature)} target="_blank" rel="noreferrer" className="block rounded-xl bg-white p-2.5 ring-1 ring-sage-300">
                <span className="font-semibold text-ink">View the transaction ↗</span>
                <span className="block break-all font-mono text-[11px] text-neutral-600">tx {short(j.anchor.signature)}</span>
              </a>
              {j.anchor.claimUrl && j.anchor.claimAddress && (
                <a href={j.anchor.claimUrl} target="_blank" rel="noreferrer" className="flex items-start gap-2 rounded-xl bg-white p-2.5 ring-1 ring-sage-300">
                  <Lock size={15} strokeWidth={2.5} className="mt-0.5 shrink-0 text-sage-700" />
                  <span><span className="font-semibold text-ink">Receipt claimed on-chain</span><span className="block text-xs text-neutral-600">It can never be counted again · claim {short(j.anchor.claimAddress)} ↗</span></span>
                </a>
              )}
            </span>
          )}
          {j.anchor === "pending" && (
            <span className="block">
              Your proof is saved. Solana didn&apos;t confirm in time.
              <button onClick={onRetryAnchor} disabled={retrying} className="mt-1.5 flex items-center gap-1.5 rounded-full bg-terra-500 px-3.5 py-1.5 text-xs font-bold text-cream disabled:opacity-60">
                <RefreshCw size={13} strokeWidth={2.5} className={retrying ? "animate-spin" : ""} /> {retrying ? "Anchoring…" : "Retry anchoring"}
              </button>
            </span>
          )}
        </Row>
        <Row state={j.passport ? "done" : j.done && !stop ? "active" : "waiting"} title="Passport updated" last>
          {j.passport && (
            <span className="block">
              <span className="font-semibold text-sage-700">+{j.passport.dCo2} kg CO₂ · +{j.passport.dPlastic} plastics · +{j.passport.dPack} g packaging</span>
              {j.passport.streak > 0 && <span className="block">🔥 {j.passport.streak}-day streak</span>}
              <button onClick={onViewPassport} className="mt-1 text-xs font-semibold text-sage-700 underline">See your passport ↑</button>
            </span>
          )}
        </Row>
      </ol>

      {j.error && (
        <div className="mb-3 rounded-2xl bg-terra-100 p-3 text-sm text-terra-800">
          <p className="flex items-start gap-2"><Lock size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" /> {j.error.message}</p>
          {j.error.claimUrl && <a className="mt-1 block text-xs font-semibold underline" href={j.error.claimUrl} target="_blank" rel="noreferrer">See the on-chain claim ↗</a>}
        </div>
      )}

      {!running && (
        <div className="space-y-2">
          {j.done && <Link href={`/p/${j.done.id}`} className="block rounded-full bg-terra-500 py-3 text-center font-heading text-[15px] text-cream">Open share card</Link>}
          {onAgain && (
            <button onClick={onAgain} className="flex w-full items-center justify-center gap-1.5 rounded-full border-[1.5px] border-neutral-300 py-2 text-xs font-semibold text-neutral-700">
              <RefreshCw size={14} strokeWidth={2.5} /> Try scanning this same receipt again
            </button>
          )}
        </div>
      )}
    </section>
  );
}
