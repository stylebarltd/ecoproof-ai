// Pieces used by both the landing page (server) and its nav (client). No "use client" here: a client module's non-component exports would be
// client references on the server.
export const SECTIONS = [["#how", "How it works"], ["#businesses", "For businesses"], ["#customers", "For customers"], ["#pricing", "Pricing"]] as const;

/** Wordmark in the journal's serif; the leaf tile stays the app's icon. */
export const JournalWordmark = ({ className = "text-[22px]" }: { className?: string }) => (
  <span className={`font-journal-display font-bold leading-none tracking-tight text-cocoa ${className}`}>EcoProof<span className="text-honey"> AI</span></span>
);
