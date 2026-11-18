import { boolean, check, customType, doublePrecision, index, integer, pgTable, primaryKey, serial, text, timestamp, unique, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { MAX_PIECES, PACKAGING_TYPES, PRODUCT_CATEGORIES, PRODUCT_SOURCES, PRODUCT_STATUSES, PRODUCT_TYPES } from "./productRules";

// The database schema. Change it here, then run `npm run db:generate` to write a migration into drizzle/ and review the SQL.
// Migrations run on deploy (`npm run db:migrate`). The app itself never creates or alters tables.

const at = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });
/** `col IN ('a', 'b')` for a check constraint, from one of the fixed lists. */
const oneOf = (col: unknown, values: readonly string[]) => sql`${col} IN (${sql.raw(values.map((v) => `'${v}'`).join(", "))})`;
const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const records = pgTable("records", {
  id: text().primaryKey(),
  userId: text("user_id").notNull(),
  merchant: text(),
  items: text().notNull(),
  co2Kg: doublePrecision("co2_kg"),
  plasticItems: integer("plastic_items"),
  packagingG: doublePrecision("packaging_g"),
  sustainableItems: integer("sustainable_items"),
  hash: text().notNull(),
  signature: text(),
  createdAt: at("created_at").defaultNow().notNull(),
  receiptFp: text("receipt_fp"),
  claimAddress: text("claim_address"),
  brandId: text("brand_id"),
  orderId: text("order_id"),
  placeId: text("place_id"),
  source: text(),
  impactNote: text("impact_note"),
}, (t) => [
  index("records_place").on(t.placeId).where(sql`(place_id IS NOT NULL)`),
  uniqueIndex("records_receipt_fp").on(t.receiptFp).where(sql`(receipt_fp IS NOT NULL)`),
]);

export const places = pgTable("places", {
  id: text().primaryKey(),
  name: text().notNull(),
  type: text().notNull(),
  lat: doublePrecision().notNull(),
  lng: doublePrecision().notNull(),
  demo: boolean().default(false).notNull(),
  ownerVerified: boolean("owner_verified").default(false).notNull(),
});

export const pledges = pgTable("pledges", {
  placeId: text("place_id").notNull(),
  practice: text().notNull(),
  detail: text(),
  createdAt: at("created_at").defaultNow().notNull(),
  ownerConfirmed: boolean("owner_confirmed").default(false).notNull(),
}, (t) => [primaryKey({ columns: [t.placeId, t.practice], name: "pledges_pkey" })]);

export const stampPlaces = pgTable("stamp_places", {
  id: text().primaryKey(),
  name: text().notNull(),
  kind: text().default("eco_shop").notNull(), // lib/placeKinds.ts
  tagline: text(),
  impactNote: text("impact_note"),
  image: text(),
  colour: text(),
  lat: doublePrecision(),
  lng: doublePrecision(),
  gpsRadiusM: integer("gps_radius_m"),
  secret: text().notNull(), // per-place signing secret (used by the signed claim links of later doors)
  createdAt: at("created_at").defaultNow().notNull(),
  owner: text(), // wallet of the owner for self-serve places; null for places we set up
  status: text().default("active").notNull(), // active | under_review | suspended
  statusNote: text("status_note"),
  statusAt: at("status_at"),
  rulesAcceptedAt: at("rules_accepted_at"), // owner accepted the eco rules when joining
  demo: boolean().default(false).notNull(), // demo places can be collected by tapping, others only by scanning their QR
  address: text(),
  alsoCafe: boolean("also_cafe").default(false).notNull(), // a restaurant that is a café too: its checklist adds the café's serving practices
  sellsOnline: boolean("sells_online").default(false).notNull(), // an eco shop's online channel (orders, parcel cards); in store = it has locations
  website: text(), // an online shop's website; where it ships from is in ship_origins
  // An eco shop's product setup (lib/products.ts): the categories it sells plastic-free, whether customers may bring their own
  // containers (null = not answered yet), and when the owner declared that the listed products are sold without plastic packaging.
  productCategories: text("product_categories").array().default(sql`'{}'::text[]`).notNull(),
  refill: boolean(),
  productsDeclaredAt: at("products_declared_at"),
}, (t) => [
  index("stamp_places_owner").on(t.owner).where(sql`(owner IS NOT NULL)`),
  check("stamp_places_kind", sql`${t.kind} IN ('cafe', 'restaurant', 'hotel', 'eco_shop')`),
]);

export const stampPlaceLocations = pgTable("stamp_place_locations", {
  id: serial().primaryKey(),
  placeId: text("place_id").notNull(),
  name: text(),
  lat: doublePrecision().notNull(),
  lng: doublePrecision().notNull(),
}, (t) => [unique("stamp_place_locations_place_id_lat_lng_key").on(t.placeId, t.lat, t.lng)]);

export const nftMints = pgTable("nft_mints", {
  id: text().primaryKey(),
  ownerKey: text("owner_key").notNull(),
  milestone: integer().notNull(),
  status: text().default("pending").notNull(), // pending | minting | minted | merged (a linked device's duplicate of a milestone the wallet already has)
  stats: text().notNull(),
  svg: text(),
  wallet: text(),
  assetId: text("asset_id"),
  mintSignature: text("mint_signature"),
  freezeSignature: text("freeze_signature"),
  error: text(),
  createdAt: at("created_at").defaultNow().notNull(),
  mintedAt: at("minted_at"),
  serial: integer(), // "Warden #0007": set once, when the NFT is minted, so it never shifts
}, (t) => [
  unique("nft_mints_owner_key_milestone_key").on(t.ownerKey, t.milestone),
  uniqueIndex("nft_mints_serial").on(t.milestone, t.serial).where(sql`(serial IS NOT NULL)`),
]);

export const claimCards = pgTable("claim_cards", {
  code: text().primaryKey(),
  placeId: text("place_id").notNull(),
  batch: text().notNull(),
  createdAt: at("created_at").defaultNow().notNull(),
  claimedAt: at("claimed_at"),
  recordId: text("record_id"),
}, (t) => [index("claim_cards_batch").on(t.batch)]);

export const wooOrders = pgTable("woo_orders", {
  placeId: text("place_id").notNull(),
  orderId: text("order_id").notNull(),
  status: text().default("valid").notNull(), // valid | void (refunded / cancelled before it was claimed)
  items: text().notNull(), // only product names, quantities and the computed impact: no prices, no customer data
  impact: text().notNull(),
  line: text().notNull(),
  claimedAt: at("claimed_at"),
  recordId: text("record_id"),
  createdAt: at("created_at").defaultNow().notNull(),
  updatedAt: at("updated_at").defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.placeId, t.orderId], name: "woo_orders_pkey" })]);

export const placeReports = pgTable("place_reports", {
  id: text().primaryKey(),
  placeId: text("place_id").notNull(),
  reporter: text().notNull(),
  reason: text().notNull(),
  details: text(),
  verifiedVisitor: boolean("verified_visitor").default(false).notNull(), // the reporter has a stamp from this place
  createdAt: at("created_at").defaultNow().notNull(),
  resolvedAt: at("resolved_at"),
  resolution: text(),
}, (t) => [index("place_reports_place").on(t.placeId, t.createdAt)]);

/** Wallet deep-link sign-ins in progress (ephemeral keys, a few minutes). */
export const authDl = pgTable("auth_dl", {
  sid: text().primaryKey(),
  claimHash: text("claim_hash").notNull(),
  state: text().notNull(),
  returnTo: text("return_to").default("/").notNull(),
  status: text().default("pending").notNull(),
  address: text(),
  consumedAt: at("consumed_at"),
  createdAt: at("created_at").defaultNow().notNull(),
});

export const authNonces = pgTable("auth_nonces", {
  nonce: text().primaryKey(),
  usedAt: at("used_at").defaultNow().notNull(),
});

export const userLinks = pgTable("user_links", {
  anonId: text("anon_id").primaryKey(),
  wallet: text().notNull(),
  linkedAt: at("linked_at").defaultNow().notNull(),
}, (t) => [index("user_links_wallet").on(t.wallet)]);

/** Share-link ids, so a device id is never published. */
export const publicPassports = pgTable("public_passports", {
  publicId: text("public_id").primaryKey(),
  userId: text("user_id").notNull().unique("public_passports_user_id_key"),
});

// Accounts and sessions, managed by Better Auth (lib/auth.ts). The keys are the field names Better Auth uses.
// A person's passport id is their wallet when the account has one, else "u_" + auth_user.id (lib/ids.ts).

export const authUser = pgTable("auth_user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique("auth_user_email_key"), // a placeholder for wallet-only accounts (lib/solanaAuth.ts)
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text(),
  createdAt: at("created_at").defaultNow().notNull(),
  updatedAt: at("updated_at").defaultNow().notNull(),
});

export const authSession = pgTable("auth_session", {
  id: text().primaryKey(),
  expiresAt: at("expires_at").notNull(),
  token: text().notNull().unique("auth_session_token_key"),
  createdAt: at("created_at").defaultNow().notNull(),
  updatedAt: at("updated_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
}, (t) => [index("auth_session_user").on(t.userId)]);

/** One row per sign-in method of an account: providerId "solana" (accountId = the wallet address) "google" or "facebook". */
export const authAccount = pgTable("auth_account", {
  id: text().primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: at("access_token_expires_at"),
  refreshTokenExpiresAt: at("refresh_token_expires_at"),
  scope: text(),
  password: text(),
  createdAt: at("created_at").defaultNow().notNull(),
  updatedAt: at("updated_at").defaultNow().notNull(),
}, (t) => [
  index("auth_account_user").on(t.userId),
  uniqueIndex("auth_account_provider").on(t.providerId, t.accountId), // a wallet (or Google or Facebook login) belongs to one account only
]);

export const authVerification = pgTable("auth_verification", {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: at("expires_at").notNull(),
  createdAt: at("created_at").defaultNow().notNull(),
  updatedAt: at("updated_at").defaultNow().notNull(),
}, (t) => [index("auth_verification_identifier").on(t.identifier)]);

// Who runs a place. member_key is a passport id (a wallet, or "u_" + account id), like everywhere else: any id of the signed-in
// account counts. stamp_places.owner stays as the place's current main owner (shown to admins).

/** role: owner (everything, including the shop secret and the team) | staff (QR codes, printed cards, customer activity). */
export const placeMembers = pgTable("place_members", {
  placeId: text("place_id").notNull(),
  memberKey: text("member_key").notNull(),
  role: text().notNull(),
  addedAt: at("added_at").defaultNow().notNull(),
  addedBy: text("added_by"),
}, (t) => [primaryKey({ columns: [t.placeId, t.memberKey], name: "place_members_pkey" }), index("place_members_key").on(t.memberKey)]);

/** Invite links. Only the hash of the token is stored. role: staff | owner (accepting an owner invite hands the place over). */
export const placeInvites = pgTable("place_invites", {
  tokenHash: text("token_hash").primaryKey(),
  placeId: text("place_id").notNull(),
  role: text().notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: at("created_at").defaultNow().notNull(),
  expiresAt: at("expires_at").notNull(),
  acceptedAt: at("accepted_at"),
  acceptedBy: text("accepted_by"),
}, (t) => [index("place_invites_place").on(t.placeId)]);

// Eco practices and stars. Which practices exist, and their points, live in data/practices.json (ids are stable); this keeps the
// owner's answer per practice. Stars are computed from it (lib/stars.ts), never stored.
export const placePractices = pgTable("place_practices", {
  placeId: text("place_id").notNull(),
  practiceId: text("practice_id").notNull(),
  status: text().notNull(), // yes | no | not_applicable
  updatedAt: at("updated_at").defaultNow().notNull(),
}, (t) => [
  primaryKey({ columns: [t.placeId, t.practiceId], name: "place_practices_pkey" }),
  check("place_practices_status", sql`${t.status} IN ('yes', 'no', 'not_applicable')`),
]);

/** Where an online shop ships from: one row per warehouse, each serving a list of countries (ISO 3166 alpha-2, e.g. "US"), or every
 *  country no other origin serves (empty list). The pin is for distances ("nearest"), never drawn on the map. lib/shipping.ts */
export const shipOrigins = pgTable("ship_origins", {
  id: serial().primaryKey(),
  placeId: text("place_id").notNull(),
  label: text().notNull(),
  lat: doublePrecision(),
  lng: doublePrecision(),
  countries: text().array().default(sql`'{}'::text[]`).notNull(),
}, (t) => [index("ship_origins_place").on(t.placeId)]);

/** "Where to get it": which practices an eco shop's products help a café, restaurant or hotel with (practice ids from
 *  data/practices.json), with the product and an optional link. Suggestions only; they never affect stars. lib/supplies.ts */
export const shopSupplies = pgTable("shop_supplies", {
  placeId: text("place_id").notNull(),
  practiceId: text("practice_id").notNull(),
  product: text().notNull(),
  url: text(),
}, (t) => [primaryKey({ columns: [t.placeId, t.practiceId], name: "shop_supplies_pkey" }), index("shop_supplies_practice").on(t.practiceId)]);

/** What an owner published: a frozen copy of the place type and answers, hashed and written to Solana as a memo (lib/declarations.ts).
 *  place_practices is the owner's draft; only the latest declaration is public. Rows are never updated except to add the proof. */
export const practiceDeclarations = pgTable("practice_declarations", {
  id: text().primaryKey(),
  placeId: text("place_id").notNull(),
  version: integer().notNull(),
  kind: text().notNull(),
  alsoCafe: boolean("also_cafe").notNull(),
  answers: text().notNull(), // JSON { [practiceId]: status }, keys sorted
  checklistHash: text("checklist_hash").notNull(), // sha256 of the checklist answered (data/practices.json for this type)
  score: integer().notNull(),
  stars: doublePrecision().notNull(), // half stars: 4.5
  declaredBy: text("declared_by").notNull(),
  createdAt: at("created_at").notNull(),
  hash: text().notNull(),
  signature: text(), // null while the proof is pending
  claimAddress: text("claim_address"),
}, (t) => [unique("practice_declarations_version").on(t.placeId, t.version)]);

/** "Not true" reports from visitors about one practice. No UI yet (step 2); a confirmed report will remove that practice's points. */
export const practiceReports = pgTable("practice_reports", {
  id: serial().primaryKey(),
  placeId: text("place_id").notNull(),
  practiceId: text("practice_id").notNull(),
  reporter: text().notNull(), // passport key
  note: text(),
  createdAt: at("created_at").defaultNow().notNull(),
  status: text().default("open").notNull(), // open | confirmed | rejected
  resolvedAt: at("resolved_at"),
}, (t) => [index("practice_reports_place").on(t.placeId, t.practiceId)]);

/** Up to three photos per place, picked by its owner: the place itself, its products, or screenshots of an online shop. The JPEG is
 *  shrunk in the browser and kept here (no file storage yet); the lowest position is the cover. lib/placePhotos.ts */
export const placePhotos = pgTable("place_photos", {
  id: text().primaryKey(), // random: it is the photo's URL, so a replaced photo never shows a cached old one
  placeId: text("place_id").notNull(),
  position: integer().notNull(),
  bytes: bytea().notNull(),
  createdAt: at("created_at").defaultNow().notNull(),
}, (t) => [index("place_photos_place").on(t.placeId, t.position)]);

// The eco product standard (docs/eco-product-standard.md): what a shop sells without plastic, and what a receipt line of it is worth.
// The fixed lists live in lib/productRules.ts.

/** A product a shop sells plastic-free. It carries no impact numbers: those are always looked up in impact_factors by its product
 *  type (and counted once per piece in the pack), so an owner has nothing to set or override. */
export const products = pgTable("products", {
  id: text().primaryKey(),
  placeId: text("place_id").notNull(),
  receiptName: text("receipt_name").notNull(), // exactly as printed on the receipt: the matching key
  displayName: text("display_name").notNull(),
  category: text().notNull(),
  packagingType: text("packaging_type").notNull(),
  productType: text("product_type").default("other").notNull(), // which row of the impact table it is (lib/productRules.ts)
  pieces: integer().default(1).notNull(), // how many of the thing are in the pack: a set of 3 wraps is 3
  replaces: text(), // the single-use item it replaces, for reusables
  photoUrl: text("photo_url"),
  source: text().notNull(),
  status: text().default("declared").notNull(),
  createdAt: at("created_at").defaultNow().notNull(),
}, (t) => [
  unique("products_receipt_name").on(t.placeId, t.receiptName),
  check("products_category", oneOf(t.category, PRODUCT_CATEGORIES)),
  check("products_packaging_type", oneOf(t.packagingType, PACKAGING_TYPES)),
  check("products_product_type", oneOf(t.productType, PRODUCT_TYPES)),
  check("products_pieces", sql`${t.pieces} BETWEEN 1 AND ${sql.raw(String(MAX_PIECES))}`),
  check("products_source", oneOf(t.source, PRODUCT_SOURCES)),
  check("products_status", oneOf(t.status, PRODUCT_STATUSES)),
]);

/** A bundle's contents: `count` of another product on the same shop's list. A product with parts counts as the sum of its parts
 *  (its own type and pieces are ignored); parts are never bundles themselves. lib/products.ts */
export const productParts = pgTable("product_parts", {
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  partId: text("part_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  count: integer().notNull(),
}, (t) => [
  primaryKey({ columns: [t.productId, t.partId], name: "product_parts_pkey" }),
  check("product_parts_count", sql`${t.count} BETWEEN 1 AND ${sql.raw(String(MAX_PIECES))}`),
]);

/** The same product printed differently on other receipts, so it stays one product. */
export const productAliases = pgTable("product_aliases", {
  id: serial().primaryKey(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  receiptNameVariant: text("receipt_name_variant").notNull(),
}, (t) => [unique("product_aliases_variant").on(t.productId, t.receiptNameVariant)]);

/** Plastic and CO2 avoided per piece, by product type: the standard's table (section 5), seeded by the migration. EcoProof's own:
 *  no owner-facing route may write it. A type without a row is worth nothing. */
export const impactFactors = pgTable("impact_factors", {
  productType: text("product_type").primaryKey(),
  plasticG: integer("plastic_g").notNull(),
  co2G: integer("co2_g").notNull(),
}, (t) => [check("impact_factors_product_type", oneOf(t.productType, PRODUCT_TYPES))]);

/** One line of a scanned receipt. A line without a matched product waits in the owner's "Confirm these products?" queue. */
export const receiptLines = pgTable("receipt_lines", {
  id: serial().primaryKey(),
  placeId: text("place_id").notNull(), // the shop the receipt is from: the owner's queue reads by it
  claimId: text("claim_id"), // records.id of the stamp this receipt earned; null when no line of it counted
  rawText: text("raw_text").notNull(),
  price: doublePrecision(),
  matchedProductId: text("matched_product_id").references(() => products.id, { onDelete: "set null" }),
  confidence: doublePrecision(), // 1 for an exact or alias match, the fuzzy score otherwise
  dismissed: boolean().default(false).notNull(), // the owner said "not plastic-free": this wording leaves the queue for good
  createdAt: at("created_at").defaultNow().notNull(),
}, (t) => [
  index("receipt_lines_claim").on(t.claimId),
  index("receipt_lines_unmatched").on(t.placeId, t.createdAt).where(sql`(matched_product_id IS NULL)`),
]);

/** A visitor's "Not true" about one product. One per reporter; two confirmed ones remove the product (lib/productRules.ts). */
export const productReports = pgTable("product_reports", {
  id: serial().primaryKey(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  reporterId: text("reporter_id").notNull(), // passport key
  reason: text().notNull(),
  confirmed: boolean().default(false).notNull(),
  createdAt: at("created_at").defaultNow().notNull(),
}, (t) => [unique("product_reports_reporter").on(t.productId, t.reporterId)]);

/** A product's photo: one JPEG, shrunk in the browser like a place photo. products.photo_url points at the route that serves it. */
export const productPhotos = pgTable("product_photos", {
  productId: text("product_id").primaryKey().references(() => products.id, { onDelete: "cascade" }),
  bytes: bytea().notNull(),
});

/** The shop's sample receipt from onboarding: how its receipts print the shop name and the lines. Only the owner and EcoProof see it. */
export const receiptSamples = pgTable("receipt_samples", {
  placeId: text("place_id").primaryKey(),
  bytes: bytea().notNull(),
  createdAt: at("created_at").defaultNow().notNull(),
});

/** What a shop's plugin sent of its catalogue (lib/catalogue.ts): one row per product, or per variation when the variations are
 *  different pack sizes. It is a proposal for the owner to confirm, never a declared product: `proposed_type` and `proposed_pieces`
 *  are the AI's reading of the name (null type = it doesn't look plastic-free). `key` is the shop system's number ("woo:80318",
 *  "woo:80318:91234"); `main_key` says the row is a translation of that product. */
export const catalogueItems = pgTable("catalogue_items", {
  id: serial().primaryKey(),
  placeId: text("place_id").notNull(),
  key: text().notNull(),
  name: text().notNull(),
  mainKey: text("main_key"),
  proposedType: text("proposed_type"),
  proposedPieces: integer("proposed_pieces").default(1).notNull(),
  state: text().default("open").notNull(), // open | added | skipped
  updatedAt: at("updated_at").defaultNow().notNull(),
}, (t) => [
  unique("catalogue_items_key").on(t.placeId, t.key),
  check("catalogue_items_state", sql`${t.state} IN ('open', 'added', 'skipped')`),
]);
