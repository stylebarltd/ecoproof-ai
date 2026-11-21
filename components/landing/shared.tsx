// Pieces used by both the landing page (server) and its nav (client). No "use client" here: a client module's non-component exports would be
// client references on the server.
// The homepage's navigation points, in the order the sections come on the page. No "Pricing" for now (Pola, 2026-11-21: businesses are not charged; the
// pricing section itself stays on the page). "Your proof", not "For customers": too blunt for a page that speaks to the reader (Pola); it picks up the section headline, "I am eco, and I have proof."
export const SECTIONS = [["#customers", "Your proof"], ["#how", "How it works"], ["#businesses", "For businesses"]] as const;

/** Wordmark in the journal's serif; the stamp logo is the app's icon. */
export const JournalWordmark = ({ className = "text-[22px]" }: { className?: string }) => (
  <span className={`font-journal-display font-bold leading-none tracking-tight text-cocoa ${className}`}>EcoProof</span>
);
