# EcoProof – Eco Product Standard & Shop Onboarding

Copied on 2026-11-16 from the Claude Doc of the same name, which stays the working copy. What is built from it is in `CLAUDE.md`.

## 1. What counts as an eco product

A product counts as eco in EcoProof if it meets at least one of two criteria:

1. **Replaces a single-use plastic item.** Examples: beeswax wraps, soap and shampoo bars, bamboo toothbrushes, toothpaste tabs, reusable bottles and cutlery, cloth bags.
2. **Is packaged without plastic.** Examples: food in glass jars, paper or metal packaging, bulk and refill purchases into the customer's own container.

Impact is always expressed as **plastic avoided (grams) and CO2 avoided (grams)**, consistent with the rest of EcoProof.

**Out of the core score:** organic, fair trade, ethical production and similar claims. They cannot be verified from a receipt or a photo. At most they may become a small bonus when a recognised certification logo is visible on the product, or they belong to the later optional certification layer, together with everything else not visible to the customer.

## 2. How we know a product is plastic-free

Three layers, cheapest first.

1. **The shop declares it.** On onboarding the shop lists its plastic-free products with the exact name as printed on the receipt. A receipt line from that shop matches a known product. Same trust model as the owner filling in the star list.
2. **The customer shows it.** If a receipt line is unknown, the app asks for one photo of the product. The AI classifies the packaging (glass, paper, metal, bare, plastic). Once confirmed, the product becomes known for everyone. The first scanner does the work once.
3. **The community corrects it.** The existing "Not true" report flow applies. A shop that marks plastic-wrapped products as eco loses the flag for that product and, on repeated confirmed reports, its map entry.

No barcode or product database lookup in step one. Small shops in Thailand will not be covered by them.

## 3. Shop onboarding form

Target: a small shop finishes the required part in about two minutes. Only 3.1 and 3.4 are required; 3.2, 3.3 and 3.5 carry a "Skip for now" button and can be completed later from the owner dashboard. The skip screen says plainly: the more products you add, the more impact your customers collect and the more your store shows on the map and on social cards. A shop with no products listed still appears on the map; its receipt lines go through the customer photo path until the owner confirms them.

### 3.1 Shop basics

- Shop name
- Location pin (used for the ~100 m GPS receipt check)
- Opening hours
- Type: physical shop, online shop, or both
- One sample receipt photo, so the AI learns the receipt format and shop name as printed (skippable; the first customer scan then serves as the sample)

### 3.2 Plastic-free product categories

The owner ticks the categories they sell plastic-free, from a fixed list:

- Food in glass, paper or metal
- Bulk and refill (dry goods, liquids, cleaning products)
- Soap and cosmetics as bars or refills
- Reusables (wraps, bottles, cups, cutlery, bags)
- Household (brushes, cloths, sponges, loofahs)

### 3.3 Products per category

For each ticked category the owner adds their main products:

- Name **exactly as it appears on the receipt** (this is the matching key)
- One product photo
- Packaging type (glass, paper, metal, none, refill)
- Optional: what single-use item it replaces (for reusables)

### 3.4 Declaration

Checkbox: "The products listed are sold without plastic packaging." With a note that customers can report otherwise and confirmed reports remove the product from the eco list.

### 3.5 Refill

Yes or no: customers may bring their own containers. Shown on the map even though eco shops get no stars.

## 4. Growing the list over time

- Unknown receipt lines that customers photograph are queued for the shop owner: "Customers scanned these items – confirm as plastic-free?"
- Confirmed items join the shop's product list automatically.
- Online shops keep the existing order webhook and order-email claim flow; their product list is taken from the order line items instead of receipts.

## 5. Open points

First-pass impact reference table. Figures are rough averages to refine later. CO2 uses a flat factor of 3 kg CO2 per kg of plastic avoided (production plus disposal).

| Category | Example products | Plastic avoided per purchase (g) | CO2 avoided (g) | Basis |
|---|---|---|---|---|
| Reusable wrap | Beeswax wrap, wax bag | 150 | 450 | Replaces ~100 m cling film over a year |
| Reusable container | Bottle, cup, lunchbox | 500 (capped) | 1500 | Daily use avoids ~1.5 kg/yr; capped so one item does not dominate |
| Soap / shampoo bar | Bar, solid conditioner | 80 | 240 | Replaces 2–3 plastic bottles |
| Toothpaste tabs | Jar of tabs | 100 | 300 | Replaces ~3 tubes |
| Bamboo toothbrush | Toothbrush | 20 | 60 | Replaces one plastic brush |
| Reusable cutlery / straw | Steel or bamboo set | 50 | 150 | Replaces disposable sets over its life |
| Refill into own container | Dry goods, liquids, cleaning | 20–50 | 60–150 | Packaging avoided, by container size |
| Glass instead of plastic | Jars, bottles | 30 | 90 | Plastic jar or bottle avoided |
| Paper or metal instead of plastic | Packs, tins | 10–20 | 30–60 | Plastic pack avoided |

Still open:

- Whether a certification-logo bonus is wanted at all, or everything non-visible stays in the certification layer.

## 6. Product data model

Builds on the existing Places model. Owners never set impact figures: EcoProof computes impact from category and packaging, so there is nothing to override. The same rule applies to online shops feeding orders by webhook.

| Entity | Fields | Notes |
|---|---|---|
| Product | place_id, receipt_name, display_name, category, packaging_type (glass, paper, metal, none, refill), replaces (optional), photo, source (owner, customer_photo, order_webhook), status (declared, confirmed, reported, removed) | receipt_name is the matching key; no impact fields on the product |
| ProductAlias | product_id, receipt_name_variant | Same jar printed differently on different receipts; keeps one product per item |
| ImpactFactor | category, packaging_type, plastic_g, co2_g | The table in section 5; owned by EcoProof, not editable by shops |
| ReceiptLine | claim_id, raw_text, price, matched_product_id (nullable), confidence | Unmatched lines feed the owner's confirmation queue |
| Report | product_id, reporter_id, reason, confirmed | Two confirmed reports set the product to removed |

Matching order for a receipt line: exact receipt_name, then alias, then AI fuzzy match above a confidence threshold, then customer photo.
