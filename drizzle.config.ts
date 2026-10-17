import { defineConfig } from "drizzle-kit";

// Migrations use the direct (unpooled) connection when there is one: Neon's pooler doesn't suit DDL.
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "" },
});
