import { query } from "./db";
import { hmac } from "./secret";
import { pointsFor } from "./stampClasses";

// What a place's customers did, for its owner and staff. Customers stay anonymous: counts, and stamps labelled "Customer 3F9A"
// (a per-place code that can't be traced back to a passport id). Days are counted in Thai time, like stamps (lib/stampPlaces.ts).

export type Source = "qr" | "card" | "order";
export type ShopActivity = {
  days: number;
  /** One entry per day, oldest first, with stamps per way of collecting. */
  series: { day: string; qr: number; card: number; order: number }[];
  stamps: number;
  bySource: Record<Source, number>;
  customers: number;
  /** Customers whose first stamp here was in this period; the rest had been before. */
  newCustomers: number;
  returningCustomers: number;
  impact: { co2Kg: number; plasticItems: number; verifiedPurchases: number };
  /** Bee Guardians unlocked by the stamp collected here (a customer's NFTs come from all their stamps, at every place). */
  beeGuardians: number;
  /** Printed cards and online orders: how many were turned into stamps (all time). */
  cards: { printed: number; claimed: number };
  orders: { sent: number; claimed: number };
  recent: { id: string; at: string; source: Source; customer: string; points: number; co2Kg: number; plasticItems: number; signature: string | null }[];
};

const BKK = "Asia/Bangkok";

export async function shopActivity(placeId: string, days: number): Promise<ShopActivity> {
  const since = `now() - interval '${days} days'`;
  const series = await query<{ day: string; source: Source; n: number }>(
    `SELECT to_char((created_at AT TIME ZONE '${BKK}')::date, 'YYYY-MM-DD') AS day, COALESCE(source, 'qr') AS source, COUNT(*)::int AS n
       FROM records WHERE place_id=$1 AND created_at > ${since} GROUP BY 1, 2`,
    [placeId],
  );
  const today = new Date(Date.now() + 7 * 3_600_000);
  const dayList = Array.from({ length: days }, (_, i) => new Date(today.getTime() - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10));
  const bySource: Record<Source, number> = { qr: 0, card: 0, order: 0 };
  const perDay = dayList.map((day) => {
    const row = { day, qr: 0, card: 0, order: 0 };
    for (const s of series.filter((x) => x.day === day)) { row[s.source] += s.n; bySource[s.source] += s.n; }
    return row;
  });

  const [c] = await query<{ customers: number; fresh: number; co2: number | null; plastic: number | null; orders: number }>(
    `WITH inperiod AS (SELECT * FROM records WHERE place_id=$1 AND created_at > ${since}),
          firsts AS (SELECT user_id, MIN(created_at) AS first FROM records WHERE place_id=$1 GROUP BY user_id)
     SELECT (SELECT COUNT(DISTINCT user_id) FROM inperiod)::int AS customers,
            (SELECT COUNT(*) FROM firsts WHERE first > ${since})::int AS fresh,
            (SELECT SUM(co2_kg) FROM inperiod) AS co2,
            (SELECT SUM(plastic_items) FROM inperiod)::int AS plastic,
            (SELECT COUNT(*) FROM inperiod WHERE source='order')::int AS orders`,
    [placeId],
  );
  // A Bee Guardian counts for this place when it was recorded within a few minutes after a stamp here, for the same passport.
  const [bees] = await query<{ n: number }>(
    `SELECT COUNT(DISTINCT m.id)::int AS n FROM nft_mints m JOIN records r ON r.user_id = m.owner_key
      WHERE r.place_id=$1 AND r.created_at > ${since} AND m.created_at BETWEEN r.created_at AND r.created_at + interval '5 minutes' AND m.status <> 'merged'`,
    [placeId],
  );
  const [cards] = await query<{ printed: number; claimed: number }>("SELECT COUNT(*)::int printed, COUNT(claimed_at)::int claimed FROM claim_cards WHERE place_id=$1", [placeId]);
  const [orders] = await query<{ sent: number; claimed: number }>("SELECT COUNT(*)::int sent, COUNT(claimed_at)::int claimed FROM woo_orders WHERE place_id=$1 AND status='valid'", [placeId]);
  const [kindRow] = await query<{ kind: string }>("SELECT kind FROM stamp_places WHERE id=$1", [placeId]);
  const recent = await query<{ id: string; user_id: string; created_at: string; source: Source | null; co2_kg: number | null; plastic_items: number | null; signature: string | null }>(
    "SELECT id, user_id, created_at, source, co2_kg, plastic_items, signature FROM records WHERE place_id=$1 ORDER BY created_at DESC LIMIT 25",
    [placeId],
  );

  return {
    days, series: perDay, stamps: bySource.qr + bySource.card + bySource.order, bySource,
    customers: c.customers, newCustomers: Math.min(c.fresh, c.customers), returningCustomers: Math.max(0, c.customers - c.fresh),
    impact: { co2Kg: Math.round((c.co2 ?? 0) * 10) / 10, plasticItems: c.plastic ?? 0, verifiedPurchases: c.orders },
    beeGuardians: bees.n, cards, orders,
    recent: recent.map((r) => ({
      id: r.id, at: new Date(r.created_at).toISOString(), source: r.source ?? "qr",
      customer: hmac("shop-customer", `${placeId}:${r.user_id}`).replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase(),
      points: pointsFor(r.source, kindRow?.kind), co2Kg: r.co2_kg ?? 0, plasticItems: r.plastic_items ?? 0, signature: r.signature,
    })),
  };
}
