import { defineConfig } from "drizzle-kit";

// Only `generate` and `check` are used, and neither connects; the URL is for drizzle-kit's other commands (e.g. `studio`).
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL || "" },
});
