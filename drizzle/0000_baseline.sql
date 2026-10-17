-- Baseline: the schema as the app used to create it on startup (lib/db.ts before migrations).
-- Every statement is idempotent, so on an existing database (production, preview) this changes nothing;
-- on an empty database it builds the full schema. It produces exactly what lib/schema.ts describes.
CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  merchant TEXT,
  items TEXT NOT NULL,
  co2_kg DOUBLE PRECISION, plastic_items INTEGER, packaging_g DOUBLE PRECISION, sustainable_items INTEGER,
  hash TEXT NOT NULL,
  signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL, demo BOOLEAN NOT NULL DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS pledges (
  place_id TEXT NOT NULL, practice TEXT NOT NULL, detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (place_id, practice)
);
--> statement-breakpoint
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS owner_confirmed BOOLEAN NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE places ADD COLUMN IF NOT EXISTS owner_verified BOOLEAN NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE records ADD COLUMN IF NOT EXISTS receipt_fp TEXT;
--> statement-breakpoint
ALTER TABLE records ADD COLUMN IF NOT EXISTS claim_address TEXT;
--> statement-breakpoint
ALTER TABLE records ADD COLUMN IF NOT EXISTS brand_id TEXT;
--> statement-breakpoint
ALTER TABLE records ADD COLUMN IF NOT EXISTS order_id TEXT;
--> statement-breakpoint
ALTER TABLE records ADD COLUMN IF NOT EXISTS place_id TEXT;
--> statement-breakpoint
ALTER TABLE records ADD COLUMN IF NOT EXISTS source TEXT;
--> statement-breakpoint
ALTER TABLE records ADD COLUMN IF NOT EXISTS impact_note TEXT;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS records_place ON records (place_id) WHERE place_id IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS stamp_places (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'shop',
  tagline TEXT, impact_note TEXT, image TEXT, colour TEXT,
  lat DOUBLE PRECISION, lng DOUBLE PRECISION, gps_radius_m INTEGER,
  secret TEXT NOT NULL, -- per-place signing secret (used by the signed claim links of later doors)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS records_receipt_fp ON records (receipt_fp) WHERE receipt_fp IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS nft_mints (
  id TEXT PRIMARY KEY, owner_key TEXT NOT NULL, milestone INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | minting | minted | merged (a linked device's duplicate of a milestone the wallet already has)
  stats TEXT NOT NULL, svg TEXT, wallet TEXT, asset_id TEXT, mint_signature TEXT, freeze_signature TEXT, error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), minted_at TIMESTAMPTZ,
  UNIQUE (owner_key, milestone)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS claim_cards (
  code TEXT PRIMARY KEY, place_id TEXT NOT NULL, batch TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), claimed_at TIMESTAMPTZ, record_id TEXT
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS woo_orders (
  place_id TEXT NOT NULL, order_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid', -- valid | void (refunded / cancelled before it was claimed)
  items TEXT NOT NULL, impact TEXT NOT NULL, line TEXT NOT NULL,  -- only product names, quantities and the computed impact: no prices, no customer data
  claimed_at TIMESTAMPTZ, record_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (place_id, order_id)
);
--> statement-breakpoint
ALTER TABLE stamp_places ADD COLUMN IF NOT EXISTS owner TEXT;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS stamp_places_owner ON stamp_places (owner) WHERE owner IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS stamp_place_locations (
  id SERIAL PRIMARY KEY, place_id TEXT NOT NULL, name TEXT, lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL,
  UNIQUE (place_id, lat, lng)
);
--> statement-breakpoint
ALTER TABLE stamp_places ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE stamp_places ADD COLUMN IF NOT EXISTS status_note TEXT;
--> statement-breakpoint
ALTER TABLE stamp_places ADD COLUMN IF NOT EXISTS status_at TIMESTAMPTZ;
--> statement-breakpoint
ALTER TABLE stamp_places ADD COLUMN IF NOT EXISTS rules_accepted_at TIMESTAMPTZ;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS place_reports (
  id TEXT PRIMARY KEY, place_id TEXT NOT NULL, reporter TEXT NOT NULL, reason TEXT NOT NULL, details TEXT,
  verified_visitor BOOLEAN NOT NULL DEFAULT false, -- the reporter has a stamp from this place
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), resolved_at TIMESTAMPTZ, resolution TEXT
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS place_reports_place ON place_reports (place_id, created_at);
--> statement-breakpoint
ALTER TABLE stamp_places ADD COLUMN IF NOT EXISTS demo BOOLEAN NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS claim_cards_batch ON claim_cards (batch);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS auth_dl (
  sid TEXT PRIMARY KEY, claim_hash TEXT NOT NULL, state TEXT NOT NULL, return_to TEXT NOT NULL DEFAULT '/',
  status TEXT NOT NULL DEFAULT 'pending', address TEXT, consumed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS auth_nonces (nonce TEXT PRIMARY KEY, used_at TIMESTAMPTZ NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS user_links (anon_id TEXT PRIMARY KEY, wallet TEXT NOT NULL, linked_at TIMESTAMPTZ NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS user_links_wallet ON user_links (wallet);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS product_impacts (
  place_id TEXT NOT NULL, product_id TEXT NOT NULL, name TEXT NOT NULL, details_hash TEXT NOT NULL,
  ai TEXT, shop TEXT, confirmed_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (place_id, product_id)
);
--> statement-breakpoint
ALTER TABLE product_impacts ADD COLUMN IF NOT EXISTS follows TEXT;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public_passports (public_id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE);
--> statement-breakpoint
ALTER TABLE nft_mints ADD COLUMN IF NOT EXISTS serial INTEGER;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS nft_mints_serial ON nft_mints (milestone, serial) WHERE serial IS NOT NULL;
