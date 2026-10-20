// Where online shops ship from, shared by server and client. A shop has one or more origins (warehouses); each serves a list of
// countries, or every country no other origin serves (an empty list, "everyone else"). The visitor's country picks the origin:
// a country-specific one first, else "everyone else". On Vercel the country comes from the x-vercel-ip-country request header.

export type ShipOrigin = { label: string; lat: number | null; lng: number | null; countries: string[] };

export const MAX_ORIGINS = 5;

/** ISO 3166-1 alpha-2 codes, for the country picker and to validate input. */
export const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK " +
  "CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS " +
  "GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV " +
  "LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM " +
  "PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR " +
  "TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");
const CODES = new Set(COUNTRY_CODES);
export const isCountry = (c: unknown): c is string => typeof c === "string" && CODES.has(c);

/** The visitor's country: ?country=XX (for testing) or Vercel's IP country header. Null when unknown (local dev). */
export function pickCountry(asked: string | null | undefined, header: string | null | undefined): string | null {
  const c = isCountry(asked?.toUpperCase()) ? asked!.toUpperCase() : header?.toUpperCase();
  return isCountry(c) ? c : null;
}
export const visitorCountry = (req: Request) => pickCountry(new URL(req.url).searchParams.get("country"), req.headers.get("x-vercel-ip-country"));

const names = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
export const countryName = (code: string) => names?.of(code) ?? code;

/** Who an origin ships to, in words: "United States", "Thailand and Laos", or "everyone else". */
export function servesText(o: ShipOrigin, everyone: boolean) {
  if (!o.countries.length) return everyone ? "everywhere" : "everywhere else";
  const n = o.countries.map(countryName);
  return n.length <= 3 ? n.join(n.length === 2 ? " and " : ", ") : `${n.slice(0, 2).join(", ")} and ${n.length - 2} more countries`;
}

/**
 * The origin that serves a visitor in `country`: one listing that country, else the "everyone else" origin. When the country is
 * unknown, the "everyone else" origin (or the first one). shipsHere is false when no origin serves the country.
 */
export function originFor(origins: ShipOrigin[], country: string | null): { origin: ShipOrigin | null; shipsHere: boolean | null } {
  if (!origins.length) return { origin: null, shipsHere: null };
  const rest = origins.find((o) => !o.countries.length) ?? null;
  if (!country) return { origin: rest ?? origins[0], shipsHere: null };
  const own = origins.find((o) => o.countries.includes(country));
  return own || rest ? { origin: own ?? rest, shipsHere: true } : { origin: null, shipsHere: false };
}

/** Tidies an owner's list of origins; returns the problem in words if it can't be saved. */
export function cleanOrigins(input: unknown): ShipOrigin[] | string {
  if (!Array.isArray(input)) return [];
  if (input.length > MAX_ORIGINS) return `Up to ${MAX_ORIGINS} places you ship from.`;
  const out: ShipOrigin[] = [];
  for (const raw of input) {
    const o = raw as { label?: unknown; lat?: unknown; lng?: unknown; countries?: unknown };
    const label = typeof o.label === "string" ? o.label.trim().replace(/\s+/g, " ").slice(0, 80) : "";
    if (!label) return "Give each place you ship from a name, like \"Chiang Mai, Thailand\".";
    const lat = Number(o.lat), lng = Number(o.lng);
    const pin = o.lat != null && o.lng != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    const countries = [...new Set((Array.isArray(o.countries) ? o.countries : []).map((c) => String(c).toUpperCase()))];
    if (countries.some((c) => !isCountry(c))) return `"${label}": unknown country.`;
    out.push({ label, lat: pin ? lat : null, lng: pin ? lng : null, countries });
  }
  if (out.filter((o) => !o.countries.length).length > 1) return "Only one place can ship to \"everyone else\". Give the others their countries.";
  const seen = new Map<string, string>();
  for (const o of out) for (const c of o.countries) {
    if (seen.has(c)) return `${countryName(c)} is served from both "${seen.get(c)}" and "${o.label}". Pick one.`;
    seen.set(c, o.label);
  }
  return out;
}
