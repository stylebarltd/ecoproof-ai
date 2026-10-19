import { Check, Loader2 } from "lucide-react";

export type ProgressStep = { key: string; label: string; hint?: string };

/** A checklist of steps: done ones ticked, the current one spinning (with its hint), the rest greyed out. `current` null = the first. */
export default function ProgressSteps({ steps, current, finished = false, className = "" }: { steps: ProgressStep[]; current: string | null; finished?: boolean; className?: string }) {
  const at = current === null ? 0 : steps.findIndex((s) => s.key === current);
  return (
    <ol className={`w-full space-y-2.5 text-left ${className}`} aria-live="polite">
      {steps.map((s, i) => {
        const state = finished || i < at ? "done" : i === at ? "active" : "todo";
        return (
          <li key={s.key} className={`flex items-start gap-3 text-sm ${state === "todo" ? "text-neutral-400" : "text-ink"}`}>
            <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
              {state === "done" ? <Check size={18} strokeWidth={3} className="text-sage-600" /> : state === "active" ? <Loader2 size={18} className="animate-spin text-terra-500" /> : <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />}
            </span>
            <span><span className={state === "active" ? "font-semibold" : ""}>{s.label}{state === "active" ? "…" : ""}</span>{state === "active" && s.hint && <span className="mt-0.5 block text-xs text-neutral-500">{s.hint}</span>}</span>
          </li>
        );
      })}
    </ol>
  );
}
