import { Pool } from "pg";

const g = globalThis as unknown as { _pool?: Pool; _ready?: Promise<unknown> };

export type RecordRow = {
  id: string; user_id: string; merchant: string; items: string;
  co2_kg: number; plastic_items: number; packaging_g: number; sustainable_items: number;
  hash: string; signature: string | null; created_at: string;
};

function pool() {
  if (!g._pool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    g._pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  }
  return g._pool;
}

export async function query<T = RecordRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const p = pool();
  g._ready ??= p.query(`CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    merchant TEXT,
    items TEXT NOT NULL,
    co2_kg DOUBLE PRECISION, plastic_items INTEGER, packaging_g DOUBLE PRECISION, sustainable_items INTEGER,
    hash TEXT NOT NULL,
    signature TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await g._ready;
  return (await p.query(text, params)).rows as T[];
}
