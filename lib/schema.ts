import { boolean, doublePrecision, index, integer, pgTable, primaryKey, serial, text, timestamp, unique, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// The database schema. Change it here, then run `npm run db:generate` to write a migration into drizzle/ and review the SQL.
// Migrations run on deploy (`npm run db:migrate`). The app itself never creates or alters tables.

const at = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });

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
  kind: text().default("shop").notNull(),
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
}, (t) => [index("stamp_places_owner").on(t.owner).where(sql`(owner IS NOT NULL)`)]);

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

/** What one unit of a shop's product replaces: AI estimate (ai) and the shop's confirmed numbers (shop), see lib/productImpact.ts. */
export const productImpacts = pgTable("product_impacts", {
  placeId: text("place_id").notNull(),
  productId: text("product_id").notNull(),
  name: text().notNull(),
  detailsHash: text("details_hash").notNull(),
  ai: text(),
  shop: text(),
  confirmedAt: at("confirmed_at"),
  updatedAt: at("updated_at").defaultNow().notNull(),
  follows: text(), // a translation follows its main-language product's numbers
}, (t) => [primaryKey({ columns: [t.placeId, t.productId], name: "product_impacts_pkey" })]);

/** Share-link ids, so a device id is never published. */
export const publicPassports = pgTable("public_passports", {
  publicId: text("public_id").primaryKey(),
  userId: text("user_id").notNull().unique("public_passports_user_id_key"),
});
