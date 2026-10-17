// Applies the migrations in drizzle/ that this database hasn't had yet. Runs on every deploy (see vercel.json) and locally via `npm run db:migrate`.
// Applied migrations are recorded in drizzle.__drizzle_migrations; all pending ones run in one transaction.
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL; // the direct connection: Neon's pooler doesn't suit DDL
if (!url) {
  console.error("db:migrate: DATABASE_URL is not set");
  process.exit(1);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  const { rows } = await client.query("SELECT COUNT(*)::int n FROM drizzle.__drizzle_migrations");
  console.log(`db:migrate: up to date (${rows[0].n} migration${rows[0].n === 1 ? "" : "s"} applied)`);
} finally {
  await client.end();
}
