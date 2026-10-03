// The eco rules for places, and the reasons a customer can report one. Pure data: shared by server and client.

export const RULES_VERSION = "2026-10";

/** What every place agrees to when it joins. Self-declared; customers can report places that don't keep it. */
export const CORE_RULES = [
  "We do not serve drinks in single-use plastic (cups, lids or bottles we hand out).",
  "We do not give out plastic straws, plastic cutlery or single-use plastic takeaway containers.",
  "We are genuinely eco-minded, not just using the label.",
] as const;

const KIND_RULES: Record<string, string> = {
  online: "We do not pack orders in single-use plastic packaging as standard.",
  shop: "We do not hand out single-use plastic bags or packaging where an alternative exists.",
};
export const rulesFor = (kind: string): string[] => [...CORE_RULES, ...(KIND_RULES[kind] ? [KIND_RULES[kind]] : [])];

export const REPORT_REASONS = [
  { id: "plastic_drinks", label: "Serves drinks in single-use plastic" },
  { id: "plastic_cutlery", label: "Plastic cutlery, straws or takeaway containers" },
  { id: "not_eco", label: "Not eco at all / greenwashing" },
  { id: "wrong_place", label: "This place doesn't exist or the details are wrong" },
  { id: "other", label: "Something else" },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]["id"];
export const isReason = (r: string): r is ReportReason => REPORT_REASONS.some((x) => x.id === r);

/** This many different customers who have a stamp from the place must report it before it is paused for review. */
export const REVIEW_THRESHOLD = 3;
export const REPORT_WINDOW_DAYS = 30;

export type PlaceStatus = "active" | "under_review" | "suspended";
