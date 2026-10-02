import { query } from "./db";

import { PRACTICE_IDS, needed, type PlaceSummary, type PracticeId } from "./practices";
export * from "./practices";

type PlaceRow = { id: string; name: string; type: string; lat: number; lng: number; demo: boolean; owner_verified: boolean };

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
      id: p.id, name: p.name, type: p.type, lat: p.lat, lng: p.lng, demo: p.demo, ownerVerified: p.owner_verified,
      practices,
      reviews: rv.length,
      avgStars: rv.length ? Math.round((rv.reduce((a, r) => a + r.stars, 0) / rv.length) * 10) / 10 : null,
      verifiedCount: practices.filter((x) => x.verified).length,
      pledgedCount: practices.filter((x) => x.pledged).length,
    };
  });
}
