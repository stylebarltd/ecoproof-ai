import { Pool } from "pg";
import { databaseUrl } from "./databaseUrl.mjs";

const g = globalThis as unknown as { _pool?: Pool; _ready?: Promise<unknown> };

export type RecordRow = {
  id: string; user_id: string; merchant: string; items: string;
  co2_kg: number; plastic_items: number; packaging_g: number; sustainable_items: number;
  hash: string; signature: string | null; created_at: string;
  receipt_fp?: string | null; claim_address?: string | null; brand_id?: string | null; order_id?: string | null;
  place_id?: string | null; source?: string | null; impact_note?: string | null;
};

function pool() {
  if (!g._pool) {
    g._pool = new Pool({ connectionString: databaseUrl(), max: 3 });
  }
  return g._pool;
}

/** Tables come from the migrations in drizzle/ (`npm run db:migrate`), never from here. This only seeds the map's places. */
async function init(p: Pool) {
  const { rows } = await p.query("SELECT COUNT(*)::int n FROM places");
  if (rows[0].n === 0) {
    const places = (await import("../data/chiangmai-places.json")).default as { osm: number; name: string; type: string; lat: number; lng: number; demo?: boolean }[];
    for (const pl of places) {
      await p.query(
        "INSERT INTO places (id,name,type,lat,lng,demo) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
        [pl.demo ? `demo-${pl.osm}` : `osm-${pl.osm}`, pl.name, pl.type, pl.lat, pl.lng, !!pl.demo],
      );
    }
  }
}

/** Launch-partner places (our own place-setup). Upserted on cold start so edits to the JSON take effect; secrets are kept. */
async function seedStampPlaces(p: Pool) {
  const { randomBytes } = await import("crypto");
  const list = (await import("../data/stamp-places.json")).default as { id: string; name: string; kind: string; image?: string; demo?: boolean; colour?: string; tagline?: string; impactNote?: string | null; lat?: number; lng?: number; gpsRadiusM?: number | null; locations?: { name?: string; lat: number; lng: number }[] }[];
  for (const x of list) {
    await p.query(
      `INSERT INTO stamp_places (id,name,kind,tagline,impact_note,colour,lat,lng,gps_radius_m,secret,image,demo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, kind=EXCLUDED.kind, tagline=EXCLUDED.tagline, impact_note=EXCLUDED.impact_note, colour=EXCLUDED.colour, lat=EXCLUDED.lat, lng=EXCLUDED.lng, gps_radius_m=EXCLUDED.gps_radius_m, image=EXCLUDED.image, demo=EXCLUDED.demo`,
      [x.id, x.name, x.kind, x.tagline ?? null, x.impactNote ?? null, x.colour ?? null, x.lat ?? null, x.lng ?? null, x.gpsRadiusM ?? null, randomBytes(24).toString("hex"), x.image ?? null, !!x.demo],
    );
    await p.query("DELETE FROM stamp_place_locations WHERE place_id=$1", [x.id]); // the data file is the source of truth for seeded places (an online shop has no pin)
    for (const l of x.locations ?? []) await p.query("INSERT INTO stamp_place_locations (place_id,name,lat,lng) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING", [x.id, l.name ?? null, l.lat, l.lng]);
  }
}

export async function query<T = RecordRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const p = pool();
  g._ready ??= init(p).then(() => seedStampPlaces(p));
  await g._ready;
  return (await p.query(text, params)).rows as T[];
}
