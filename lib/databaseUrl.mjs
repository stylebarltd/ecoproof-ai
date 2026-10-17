// Which database to use. Preview deployments get their own, because the production Neon store is connected to every environment.
// The preview store (ecoproof-preview) is connected to Preview only with the prefix PREVIEW_DATABASE, which Vercel puts in front of
// each variable's name: PREVIEW_DATABASE_ + DATABASE_URL. A preview without it fails rather than touch production.
// Plain JS so scripts/migrate.mjs can share it.

/**
 * @param {{ direct?: boolean }} [opts] direct: bypass Neon's connection pooler (it doesn't suit migrations). The direct URL is
 * derived from the same URL rather than read from DATABASE_URL_UNPOOLED, so the two can never point at different databases.
 */
export function databaseUrl({ direct = false } = {}) {
  const env = process.env;
  let url = env.DATABASE_URL;
  if (env.VERCEL_ENV === "preview") {
    if (!env.PREVIEW_DATABASE_DATABASE_URL) throw new Error("PREVIEW_DATABASE_DATABASE_URL is not set: preview deployments never use the production database");
    url = env.PREVIEW_DATABASE_DATABASE_URL;
  }
  if (!url) throw new Error("DATABASE_URL is not set");
  return direct ? url.replace(/(@[^/:?]*?)-pooler\./, "$1.") : url;
}
