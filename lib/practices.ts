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
