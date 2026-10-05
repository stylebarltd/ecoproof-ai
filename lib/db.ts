import { Pool } from "pg";

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
  `ALTER TABLE records ADD COLUMN IF NOT EXISTS brand_id TEXT`,
  `ALTER TABLE records ADD COLUMN IF NOT EXISTS order_id TEXT`,
  `ALTER TABLE records ADD COLUMN IF NOT EXISTS place_id TEXT`,
  `ALTER TABLE records ADD COLUMN IF NOT EXISTS source TEXT`,
  `ALTER TABLE records ADD COLUMN IF NOT EXISTS impact_note TEXT`,
  `CREATE INDEX IF NOT EXISTS records_place ON records (place_id) WHERE place_id IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS stamp_places (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'shop',
    tagline TEXT, impact_note TEXT, image TEXT, colour TEXT,
    lat DOUBLE PRECISION, lng DOUBLE PRECISION, gps_radius_m INTEGER,
    secret TEXT NOT NULL, -- per-place signing secret (used by the signed claim links of later doors)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS records_receipt_fp ON records (receipt_fp) WHERE receipt_fp IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS nft_mints (
    id TEXT PRIMARY KEY, owner_key TEXT NOT NULL, milestone INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | minting | minted | merged (a linked device's duplicate of a milestone the wallet already has)
    stats TEXT NOT NULL, svg TEXT, wallet TEXT, asset_id TEXT, mint_signature TEXT, freeze_signature TEXT, error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), minted_at TIMESTAMPTZ,
    UNIQUE (owner_key, milestone)
  )`,
  `CREATE TABLE IF NOT EXISTS claim_cards (
    code TEXT PRIMARY KEY, place_id TEXT NOT NULL, batch TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), claimed_at TIMESTAMPTZ, record_id TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS woo_orders (
    place_id TEXT NOT NULL, order_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'valid', -- valid | void (refunded / cancelled before it was claimed)
    items TEXT NOT NULL, impact TEXT NOT NULL, line TEXT NOT NULL,  -- only product names, quantities and the computed impact: no prices, no customer data
    claimed_at TIMESTAMPTZ, record_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (place_id, order_id)
  )`,
  `ALTER TABLE stamp_places ADD COLUMN IF NOT EXISTS owner TEXT`, // wallet of the owner for self-serve places; null for places we set up
  `CREATE INDEX IF NOT EXISTS stamp_places_owner ON stamp_places (owner) WHERE owner IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS stamp_place_locations (
    id SERIAL PRIMARY KEY, place_id TEXT NOT NULL, name TEXT, lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL,
    UNIQUE (place_id, lat, lng)
  )`,
  `ALTER TABLE stamp_places ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`, // active | under_review | suspended
  `ALTER TABLE stamp_places ADD COLUMN IF NOT EXISTS status_note TEXT`,
  `ALTER TABLE stamp_places ADD COLUMN IF NOT EXISTS status_at TIMESTAMPTZ`,
  `ALTER TABLE stamp_places ADD COLUMN IF NOT EXISTS rules_accepted_at TIMESTAMPTZ`, // owner accepted the eco rules when joining
  `CREATE TABLE IF NOT EXISTS place_reports (
    id TEXT PRIMARY KEY, place_id TEXT NOT NULL, reporter TEXT NOT NULL, reason TEXT NOT NULL, details TEXT,
    verified_visitor BOOLEAN NOT NULL DEFAULT false, -- the reporter has a stamp from this place
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), resolved_at TIMESTAMPTZ, resolution TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS place_reports_place ON place_reports (place_id, created_at)`,
  `ALTER TABLE stamp_places ADD COLUMN IF NOT EXISTS demo BOOLEAN NOT NULL DEFAULT false`, // demo places can be collected by tapping, others only by scanning their QR
  `CREATE INDEX IF NOT EXISTS claim_cards_batch ON claim_cards (batch)`,
  `CREATE TABLE IF NOT EXISTS auth_dl (
    sid TEXT PRIMARY KEY, claim_hash TEXT NOT NULL, state TEXT NOT NULL, return_to TEXT NOT NULL DEFAULT '/',
    status TEXT NOT NULL DEFAULT 'pending', address TEXT, consumed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`, // wallet deep-link sign-ins in progress (ephemeral keys, a few minutes)
  `CREATE TABLE IF NOT EXISTS auth_nonces (nonce TEXT PRIMARY KEY, used_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS user_links (anon_id TEXT PRIMARY KEY, wallet TEXT NOT NULL, linked_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS user_links_wallet ON user_links (wallet)`,
  `CREATE TABLE IF NOT EXISTS product_impacts (
    place_id TEXT NOT NULL, product_id TEXT NOT NULL, name TEXT NOT NULL, details_hash TEXT NOT NULL,
    ai TEXT, shop TEXT, confirmed_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (place_id, product_id)
  )`, // what one unit of a shop's product replaces: AI estimate (ai) and the shop's confirmed numbers (shop), see lib/productImpact.ts
  `ALTER TABLE product_impacts ADD COLUMN IF NOT EXISTS follows TEXT`, // a translation follows its main-language product's numbers
  `CREATE TABLE IF NOT EXISTS public_passports (public_id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE)`, // share-link ids, so a device id is never published
  `CREATE UNIQUE INDEX IF NOT EXISTS reviews_receipt_fp ON reviews (receipt_fp) WHERE receipt_fp NOT LIKE 'demo:%'`,
  `ALTER TABLE nft_mints ADD COLUMN IF NOT EXISTS serial INTEGER`, // "Warden #0007": set once, when the NFT is minted, so it never shifts
  `CREATE UNIQUE INDEX IF NOT EXISTS nft_mints_serial ON nft_mints (milestone, serial) WHERE serial IS NOT NULL`,
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
