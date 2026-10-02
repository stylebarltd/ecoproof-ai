import Database from "better-sqlite3";
import path from "path";

const g = globalThis as unknown as { _db?: Database.Database };

export function db() {
  if (!g._db) {
    const d = new Database(path.join(process.cwd(), "ecoproof.db"));
    d.pragma("journal_mode = WAL");
    d.exec(`CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      merchant TEXT,
      items TEXT NOT NULL,
      co2_kg REAL, plastic_items INTEGER, packaging_g REAL, sustainable_items INTEGER,
      hash TEXT NOT NULL,
      signature TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    g._db = d;
  }
  return g._db;
}
