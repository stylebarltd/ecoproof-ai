// data/practices.json, bound to the star engine (lib/stars.ts). Edit the JSON to change practices, points or the star scale;
// keep practice ids stable, because owners' answers are stored by id.
import json from "@/data/practices.json";
import * as engine from "./stars";
import type { Answers, Practices } from "./stars";

export const PRACTICES = json as Practices;
export type { Answers, Group, Practice, Rating, Status } from "./stars";

export const hasStars = (kind: string) => !!PRACTICES.placeTypes[kind]?.hasStars;
export const checklist = (kind: string, alsoCafe = false) => engine.checklist(PRACTICES, kind, alsoCafe);
export const SCALE = PRACTICES.stars.scale;
export const practicesOf = engine.practicesOf;

/** A place's rating, or null when its kind has no stars. */
export function rating(kind: string, alsoCafe: boolean, answers: Answers) {
  const groups = checklist(kind, alsoCafe);
  return groups ? engine.rate(PRACTICES, groups, answers) : null;
}

export function nextStar(kind: string, alsoCafe: boolean, answers: Answers) {
  const groups = checklist(kind, alsoCafe);
  return groups ? engine.nextStar(PRACTICES, groups, answers) : null;
}

/** A practice as one topic across place types: cafés, restaurants and hotels can each have their own id for the same wording
 *  ("No plastic straws"). Shops pick topics for "Where to get it"; every id of a topic is stored. */
export type SupplyTopic = { key: string; label: string; ids: string[]; group: string; types: string[] };

export function supplyTopics(): SupplyTopic[] {
  const topics = new Map<string, SupplyTopic>();
  for (const [type, t] of Object.entries(PRACTICES.placeTypes)) {
    if (!t.hasStars || !t.groups) continue;
    for (const g of t.groups) for (const p of g.items) {
      const key = p.label.toLowerCase();
      const topic = topics.get(key) ?? topics.set(key, { key, label: p.label, ids: [], group: g.label, types: [] }).get(key)!;
      if (!topic.ids.includes(p.id)) topic.ids.push(p.id);
      if (!topic.types.includes(type)) topic.types.push(type);
    }
  }
  return [...topics.values()];
}
