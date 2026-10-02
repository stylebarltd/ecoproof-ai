import { Pool } from "pg";

const g = globalThis as unknown as { _pool?: Pool; _ready?: Promise<unknown> };

export type RecordRow = {
  id: string; user_id: string; merchant: string; items: string;
  co2_kg: number; plastic_items: number; packaging_g: number; sustainable_items: number;
  hash: string; signature: string | null; created_at: string;
  receipt_fp?: string | null; claim_address?: string | null;
};

function pool() {
  if (!g._pool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    g._pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  }
  return g._pool;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    merchant TEXT,
    items TEXT NOT NULL,
    co2_kg DOUBLE PRECISION, plastic_items INTEGER, packaging_g DOUBLE PRECISION, sustainable_items INTEGER,
    hash TEXT NOT NULL,
    signature TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS places (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL, demo BOOLEAN NOT NULL DEFAULT false
  )`,
  `CREATE TABLE IF NOT EXISTS pledges (
    place_id TEXT NOT NULL, practice TEXT NOT NULL, detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (place_id, practice)
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY, place_id TEXT NOT NULL, user_id TEXT NOT NULL,
    stars INTEGER NOT NULL, confirmed TEXT NOT NULL, byo_cup BOOLEAN NOT NULL DEFAULT false,
    receipt_fp TEXT NOT NULL, receipt_date TEXT,
    hash TEXT NOT NULL, signature TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (place_id, user_id)
  )`,
  `ALTER TABLE pledges ADD COLUMN IF NOT EXISTS owner_confirmed BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE places ADD COLUMN IF NOT EXISTS owner_verified BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE records ADD COLUMN IF NOT EXISTS receipt_fp TEXT`,
  `ALTER TABLE records ADD COLUMN IF NOT EXISTS claim_address TEXT`,
  `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS claim_address TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS records_receipt_fp ON records (receipt_fp) WHERE receipt_fp IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS reviews_receipt_fp ON reviews (receipt_fp) WHERE receipt_fp NOT LIKE 'demo:%'`,
];

async function init(p: Pool) {
  for (const sql of SCHEMA) await p.query(sql);
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

/** Shops whose owner has confirmed them to EcoProof. Upserted on every cold start so edits to the JSON take effect. */
async function seedOwnerShops(p: Pool) {
  const shops = (await import("../data/superbee-shops.json")).default as { id: string; name: string; type: string; lat: number; lng: number }[];
  for (const sh of shops) {
    await p.query(
      `INSERT INTO places (id,name,type,lat,lng,demo,owner_verified) VALUES ($1,$2,$3,$4,$5,false,true)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, lat=EXCLUDED.lat, lng=EXCLUDED.lng, owner_verified=true`,
      [sh.id, sh.name, sh.type, sh.lat, sh.lng],
    );
  }
  // SuperBee sells plastic-free products: confirmed by the owner for every SuperBee shop (including the demo shop).
  for (const id of [...shops.map((x) => x.id), "demo-0"]) {
    await p.query(
      `INSERT INTO pledges (place_id, practice, detail, owner_confirmed) VALUES ($1,'plastic_free_products',NULL,true)
       ON CONFLICT (place_id, practice) DO UPDATE SET owner_confirmed=true`,
      [id],
    );
  }
}

export async function query<T = RecordRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const p = pool();
  g._ready ??= init(p).then(() => seedOwnerShops(p));
  await g._ready;
  return (await p.query(text, params)).rows as T[];
}
