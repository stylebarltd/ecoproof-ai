import { query } from "./db";

export const PRACTICES = {
  no_styrofoam: { label: "No styrofoam takeaway", icon: "📦" },
  no_plastic_straws: { label: "No plastic straws", icon: "🥤" },
  no_plastic_cups: { label: "No plastic cups", icon: "☕" },
  byo_discount: { label: "Discount if you bring your own cup/container", icon: "🏷️" },
} as const;
export type PracticeId = keyof typeof PRACTICES;
export const PRACTICE_IDS = Object.keys(PRACTICES) as PracticeId[];

/** Distinct verified-receipt confirmations needed before a pledge earns its badge. Demo shops need 1 so the demo is quick. */
export const needed = (demo: boolean) => (demo ? 1 : 3);

export type PracticeStatus = { id: PracticeId; pledged: boolean; detail: string | null; confirmations: number; needed: number; verified: boolean };
export type PlaceSummary = {
  id: string; name: string; type: string; lat: number; lng: number; demo: boolean;
  practices: PracticeStatus[]; reviews: number; avgStars: number | null; verifiedCount: number; pledgedCount: number;
};

type PlaceRow = { id: string; name: string; type: string; lat: number; lng: number; demo: boolean };

export async function listPlaces(): Promise<PlaceSummary[]> {
  const [places, pledges, reviews] = await Promise.all([
    query<PlaceRow>("SELECT * FROM places"),
    query<{ place_id: string; practice: PracticeId; detail: string | null }>("SELECT * FROM pledges"),
    query<{ place_id: string; stars: number; confirmed: string }>("SELECT place_id, stars, confirmed FROM reviews"),
  ]);
  return places.map((p) => {
    const pl = pledges.filter((x) => x.place_id === p.id);
    const rv = reviews.filter((x) => x.place_id === p.id);
    const confirmed = rv.flatMap((r) => JSON.parse(r.confirmed) as PracticeId[]);
    const practices = PRACTICE_IDS.map((id) => {
      const pledge = pl.find((x) => x.practice === id);
      const confirmations = confirmed.filter((c) => c === id).length;
      const n = needed(p.demo);
      return { id, pledged: !!pledge, detail: pledge?.detail ?? null, confirmations, needed: n, verified: !!pledge && confirmations >= n };
    });
    return {
      id: p.id, name: p.name, type: p.type, lat: p.lat, lng: p.lng, demo: p.demo,
      practices,
      reviews: rv.length,
      avgStars: rv.length ? Math.round((rv.reduce((a, r) => a + r.stars, 0) / rv.length) * 10) / 10 : null,
      verifiedCount: practices.filter((x) => x.verified).length,
      pledgedCount: practices.filter((x) => x.pledged).length,
    };
  });
}
