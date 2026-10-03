import Link from "next/link";
import { CORE_RULES, REPORT_WINDOW_DAYS, REVIEW_THRESHOLD } from "@/lib/ecoRules";

export const metadata = { title: "Eco rules | EcoProof" };

export default function Rules() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <h1 className="text-[22px] leading-tight">Eco rules for places</h1>
      <p>EcoProof is for places that really are eco. A place can only join if it agrees to these rules:</p>
      <ul className="list-disc space-y-1.5 pl-5">{CORE_RULES.map((r) => <li key={r}>{r}</li>)}</ul>
      <p>Online shops also agree not to pack orders in single-use plastic as standard. Shops agree not to hand out single-use plastic bags or packaging where an alternative exists.</p>

      <h2 className="pt-2 text-[17px]">Who checks?</h2>
      <p>Joining is a promise: owners confirm the rules when they set up their place. We don&apos;t inspect places in person yet, so we rely on customers to tell us when a place doesn&apos;t keep it. &ldquo;Verified&rdquo; on the map means <b>claimed and set up on EcoProof</b>, not independently audited. Real vetting is on our roadmap.</p>

      <h2 className="pt-2 text-[17px]">Report a place</h2>
      <p>If a place doesn&apos;t keep these rules, open it on the map and tap <b>Report this place</b>. You choose a reason and can add a note. Reports from people who have collected a stamp at the place count most, because they have been there.</p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>When {REVIEW_THRESHOLD} different customers who have a stamp there report a place within {REPORT_WINDOW_DAYS} days, it is <b>paused</b>: hidden from the map and no new stamps, until we have looked at it.</li>
        <li>We then either restore the place or remove it. Stamps already collected stay in passports and their Solana proofs are untouched.</li>
        <li>One report per person per place every {REPORT_WINDOW_DAYS} days. Owners can&apos;t report their own place. Your report is never shown to the place.</li>
      </ul>
      <p className="rounded-2xl bg-cream p-3 text-xs text-neutral-600">Reports are reviewed by people, and we can get it wrong. If your place was paused and you think that&apos;s a mistake, contact us and we&apos;ll look again.</p>
      <Link href="/map" className="inline-block rounded-full bg-sage-500 px-4 py-2 font-bold text-cream">Back to the map</Link>
    </div>
  );
}
