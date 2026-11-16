import { randomBytes } from "node:crypto";
import { query } from "./db";
import { unmatchedLines } from "./match";
import { MAX_PHOTO_BYTES } from "./photoRules";
import { isJpeg } from "./placePhotos";
import {
  isCategory, isPackaging, MAX_PRODUCTS, PRODUCT_NAME_MAX, type Product, type ProductCategory, type ProductSetupState,
} from "./productRules";

// An eco shop's plastic-free products and their setup (docs/eco-product-standard.md): the owner declares, ticks categories, lists
// products by their receipt name, and answers the refill question. Products never carry impact numbers (impact_factors has them).

export class ProductError extends Error { constructor(message: string, public status = 400) { super(message); } }

const clean = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const photoUrl = (placeId: string, productId: string, v: string) => `/api/places/${placeId}/products/${productId}/photo?v=${v}`;

type Row = { id: string; receipt_name: string; display_name: string; category: string; packaging_type: string; replaces: string | null; photo_url: string | null; source: string; status: string };
const toProduct = (r: Row): Product => ({
  id: r.id, receiptName: r.receipt_name, displayName: r.display_name, category: r.category as Product["category"], packagingType: r.packaging_type as Product["packagingType"],
  replaces: r.replaces, photoUrl: r.photo_url, source: r.source as Product["source"], status: r.status as Product["status"],
});

/** Everything the setup wizard and the dashboard show. */
export async function productSetup(placeId: string, role: "owner" | "staff"): Promise<ProductSetupState> {
  const [[place], products, queue, sample] = await Promise.all([
    query<{ product_categories: string[]; refill: boolean | null; products_declared_at: string | null; in_store: boolean }>(
      "SELECT product_categories, refill, products_declared_at::text, (lat IS NOT NULL) AS in_store FROM stamp_places WHERE id=$1", [placeId],
    ),
    query<Row>("SELECT * FROM products WHERE place_id=$1 ORDER BY category, lower(display_name)", [placeId]),
    unmatchedLines(placeId),
    query("SELECT 1 FROM receipt_samples WHERE place_id=$1", [placeId]),
  ]);
  return {
    role,
    setup: { categories: (place?.product_categories ?? []).filter(isCategory), refill: place?.refill ?? null, declaredAt: place?.products_declared_at ?? null, hasSample: sample.length > 0, inStore: !!place?.in_store },
    products: products.map(toProduct),
    // No customer photo path yet: a queued line has no photo until the app asks the scanner for one.
    queue: queue.map((q) => ({ ...q, photoUrl: null })),
  };
}

/** Saves the parts of the setup that were sent. The declaration can be made, never withdrawn. */
export async function saveSetup(placeId: string, b: { categories?: unknown; refill?: unknown; declared?: unknown }): Promise<void> {
  if (b.categories !== undefined) {
    if (!Array.isArray(b.categories) || !b.categories.every(isCategory)) throw new ProductError("Unknown category.");
    await query("UPDATE stamp_places SET product_categories=$2 WHERE id=$1", [placeId, [...new Set(b.categories as ProductCategory[])]]);
  }
  if (b.refill !== undefined) {
    if (typeof b.refill !== "boolean") throw new ProductError("Refill is yes or no.");
    await query("UPDATE stamp_places SET refill=$2 WHERE id=$1", [placeId, b.refill]);
  }
  if (b.declared === true) await query("UPDATE stamp_places SET products_declared_at = COALESCE(products_declared_at, now()) WHERE id=$1", [placeId]);
}

/** Adds a product to the shop's list. `fromQueue`: the owner confirmed a line customers scanned. Receipt lines already scanned with this
 *  name stop waiting in the queue. */
export async function addProduct(placeId: string, b: Record<string, unknown>): Promise<void> {
  const receiptName = clean(b.receiptName, PRODUCT_NAME_MAX);
  const displayName = clean(b.displayName, PRODUCT_NAME_MAX) || receiptName;
  const replaces = clean(b.replaces, PRODUCT_NAME_MAX) || null;
  if (receiptName.length < 2) throw new ProductError("Enter the product's name exactly as your receipt prints it.");
  if (!isCategory(b.category)) throw new ProductError("Pick a category.");
  if (!isPackaging(b.packagingType)) throw new ProductError("Pick how it is packed.");
  const [place] = await query<{ products_declared_at: string | null; n: number }>(
    "SELECT products_declared_at, (SELECT COUNT(*)::int FROM products WHERE place_id=$1) AS n FROM stamp_places WHERE id=$1", [placeId],
  );
  if (!place?.products_declared_at) throw new ProductError("Confirm the declaration first: the products you list are sold without plastic packaging.");
  if (place.n >= MAX_PRODUCTS) throw new ProductError(`A shop can list ${MAX_PRODUCTS} products for now.`);
  const existing = await query<{ status: string }>("SELECT status FROM products WHERE place_id=$1 AND lower(receipt_name)=lower($2)", [placeId, receiptName]);
  if (existing.length) {
    throw new ProductError(existing[0].status === "removed" ? "This product was removed from the eco list after confirmed reports, so it can't be added again." : "That receipt name is already on your list.", 409);
  }
  const id = randomBytes(9).toString("base64url");
  await query(
    "INSERT INTO products (id, place_id, receipt_name, display_name, category, packaging_type, replaces, source, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'owner',$8)",
    [id, placeId, receiptName, displayName, b.category, b.packagingType, replaces, b.fromQueue === true ? "confirmed" : "declared"],
  );
  await query("UPDATE receipt_lines SET matched_product_id=$2, confidence=1 WHERE place_id=$1 AND matched_product_id IS NULL AND lower(btrim(raw_text))=lower($3)", [placeId, id, receiptName]);
}

/** Takes a product off the list. One with a confirmed report against it stays, so deleting and re-adding can't clear the report. */
export async function removeProduct(placeId: string, id: string): Promise<void> {
  const gone = await query("DELETE FROM products WHERE place_id=$1 AND id=$2 AND status IN ('declared','confirmed') RETURNING id", [placeId, id]);
  if (!gone.length && (await query("SELECT 1 FROM products WHERE place_id=$1 AND id=$2", [placeId, id])).length) {
    throw new ProductError("This product has a confirmed report, so it stays on record.", 409);
  }
}

function checkPhoto(bytes: Buffer) {
  if (!isJpeg(bytes)) throw new ProductError("That isn't a photo we can use. Try a JPEG, PNG or WebP.");
  if (bytes.length > MAX_PHOTO_BYTES) throw new ProductError("That photo is too large.", 413);
}

export async function setProductPhoto(placeId: string, id: string, bytes: Buffer): Promise<void> {
  checkPhoto(bytes);
  const set = await query("UPDATE products SET photo_url=$3 WHERE place_id=$1 AND id=$2 RETURNING id", [placeId, id, photoUrl(placeId, id, randomBytes(4).toString("hex"))]);
  if (!set.length) throw new ProductError("Unknown product.", 404);
  await query("INSERT INTO product_photos (product_id, bytes) VALUES ($1,$2) ON CONFLICT (product_id) DO UPDATE SET bytes=EXCLUDED.bytes", [id, bytes]);
}

export async function productPhoto(placeId: string, id: string): Promise<Buffer | null> {
  return (await query<{ bytes: Buffer }>("SELECT ph.bytes FROM product_photos ph JOIN products p ON p.id = ph.product_id WHERE p.place_id=$1 AND p.id=$2", [placeId, id]))[0]?.bytes ?? null;
}

/** The shop's sample receipt; a new one replaces the old. */
export async function saveSample(placeId: string, bytes: Buffer): Promise<void> {
  checkPhoto(bytes);
  await query("INSERT INTO receipt_samples (place_id, bytes) VALUES ($1,$2) ON CONFLICT (place_id) DO UPDATE SET bytes=EXCLUDED.bytes, created_at=now()", [placeId, bytes]);
}

/** "Not plastic-free": this wording leaves the owner's queue and stays out. */
export async function dismissLine(placeId: string, rawText: string): Promise<void> {
  await query("UPDATE receipt_lines SET dismissed=true WHERE place_id=$1 AND matched_product_id IS NULL AND lower(btrim(raw_text))=lower(btrim($2))", [placeId, rawText]);
}

/** What visitors see on the shop's page: its eco list (removed products are gone), and whether it refills. */
export async function publicProducts(placeId: string): Promise<{ refill: boolean | null; products: Product[] }> {
  const [[place], rows] = await Promise.all([
    query<{ refill: boolean | null }>("SELECT refill FROM stamp_places WHERE id=$1", [placeId]),
    query<Row>("SELECT * FROM products WHERE place_id=$1 AND status <> 'removed' ORDER BY category, lower(display_name)", [placeId]),
  ]);
  return { refill: place?.refill ?? null, products: rows.map(toProduct) };
}
