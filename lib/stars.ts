// The star engine. Pure functions over data/practices.json (passed in, so tests can load the file themselves): which practices a
// place is asked about, its score out of 100, its stars, and the easiest way to the next star. Nothing here is stored; stars are
// always computed from the answers an owner published (lib/declarations.ts).

export type Status = "yes" | "no" | "not_applicable";
export type Practice = { id: string; label: string; points: number; notApplicableAllowed?: boolean };
export type Group = { id: string; label: string; items: Practice[] };
export type PlaceType = { label: string; hasStars: boolean; notes?: string; groups?: Group[] };
export type ScaleStep = { min: number; max: number; stars: number; label?: string };
export type Practices = { version: string; country: string; stars: { scale: ScaleStep[]; notes?: string }; placeTypes: Record<string, PlaceType> };
export type Answers = Record<string, Status>;
export type Rating = { score: number; stars: number; label: string; yesPoints: number; applicablePoints: number };

/** The checklist for a place, or null when its type has no stars (eco shops). A restaurant that is also a café
 *  gets the café's "Serving" group as well, without the practices the restaurant list already has (same label). */
export function checklist(data: Practices, kind: string, alsoCafe = false): Group[] | null {
  const type = data.placeTypes[kind];
  if (!type?.hasStars || !type.groups) return null;
  if (kind !== "restaurant" || !alsoCafe) return type.groups;
  const serving = data.placeTypes.cafe?.groups?.find((g) => g.id === "serving");
  if (!serving) return type.groups;
  const have = new Set(type.groups.flatMap((g) => g.items.map((i) => i.label.toLowerCase())));
  const extra = serving.items.filter((i) => !have.has(i.label.toLowerCase()));
  return extra.length ? [...type.groups, { id: "cafe_serving", label: "Café serving", items: extra }] : type.groups;
}

export const practicesOf = (groups: Group[]) => groups.flatMap((g) => g.items);

/** Not applicable only counts where the practice allows it; anywhere else it is treated as "no". */
const isNA = (p: Practice, answers: Answers) => answers[p.id] === "not_applicable" && !!p.notApplicableAllowed;

/** The step of the star scale a score falls in. */
export function stepFor(data: Practices, score: number): ScaleStep {
  const scale = data.stars.scale;
  return scale.find((s) => score >= s.min && score <= s.max) ?? scale[0];
}

export const starLabel = (step: ScaleStep) => step.label ?? `${step.stars} star${step.stars === 1 ? "" : "s"}`;

/** Score = points of the practices answered "yes", out of the points of every practice that applies, scaled to 100 and rounded
 *  down (a place never rounds up into a star). Unanswered counts as "no". */
export function rate(data: Practices, groups: Group[], answers: Answers): Rating {
  let yesPoints = 0, applicablePoints = 0;
  for (const p of practicesOf(groups)) {
    if (isNA(p, answers)) continue;
    applicablePoints += p.points;
    if (answers[p.id] === "yes") yesPoints += p.points;
  }
  const score = applicablePoints ? Math.floor((100 * yesPoints) / applicablePoints) : 0;
  const step = stepFor(data, score);
  return { score, stars: step.stars, label: starLabel(step), yesPoints, applicablePoints };
}

/** The fewest practices still open (not "yes", not validly not applicable) that lift the place to its next star; among those,
 *  the set with the fewest points, so the step is as small as it can be. Null at the top of the scale or when no set gets there. */
export function nextStar(data: Practices, groups: Group[], answers: Answers): { stars: number; label: string; items: Practice[] } | null {
  const now = rate(data, groups, answers);
  const next = data.stars.scale.find((s) => s.stars > now.stars);
  if (!next || !now.applicablePoints) return null;
  // floor(100 * (yes + x) / applicable) >= next.min  <=>  x >= (next.min * applicable - 100 * yes) / 100
  const need = Math.ceil((next.min * now.applicablePoints - 100 * now.yesPoints) / 100);
  const open = practicesOf(groups).filter((p) => answers[p.id] !== "yes" && !isNA(p, answers)).sort((a, b) => b.points - a.points);

  // Fewest items: the biggest ones first.
  let k = 0;
  for (let sum = 0; k < open.length && sum < need; k++) sum += open[k].points;
  if (open.slice(0, k).reduce((s, p) => s + p.points, 0) < need) return null;

  // Among sets of k items, the one with the smallest total that still reaches `need` (sums are small: a table of reachable sums).
  let best: Map<number, Practice[]>[] = [new Map([[0, []]])];
  for (const p of open) {
    const nextBest = best.map((m) => new Map(m));
    best.forEach((m, j) => {
      if (j >= k) return;
      for (const [sum, items] of m) {
        const target = (nextBest[j + 1] ??= new Map());
        if (!target.has(sum + p.points)) target.set(sum + p.points, [...items, p]);
      }
    });
    best = nextBest;
  }
  const sums = [...(best[k]?.keys() ?? [])].filter((s) => s >= need).sort((a, b) => a - b);
  return { stars: next.stars, label: starLabel(next), items: best[k]!.get(sums[0])! };
}
