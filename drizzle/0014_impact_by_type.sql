CREATE TABLE "impact_factors" (
	"product_type" text PRIMARY KEY NOT NULL,
	"plastic_g" integer NOT NULL,
	"co2_g" integer NOT NULL,
	CONSTRAINT "impact_factors_product_type" CHECK ("impact_factors"."product_type" IN ('reusable_wrap', 'reusable_container', 'reusable_cutlery_straw', 'soap_bar', 'toothpaste_tabs', 'bamboo_toothbrush', 'refill', 'glass_pack', 'paper_metal_pack', 'other'))
);
--> statement-breakpoint
-- Seed: section 5 of docs/eco-product-standard.md, row for row, per piece; CO2 = 3 g per g of plastic. Where the standard gives a range
-- (refill 20-50 g, paper or metal 10-20 g) the low end is used. 'other' has no row: it counts nothing.
INSERT INTO "impact_factors" ("product_type", "plastic_g", "co2_g") VALUES
	('reusable_wrap', 150, 450),            -- replaces ~100 m cling film over a year
	('reusable_container', 500, 1500),      -- daily use avoids ~1.5 kg/yr; capped so one item does not dominate
	('reusable_cutlery_straw', 50, 150),    -- replaces disposable sets over its life
	('soap_bar', 80, 240),                  -- replaces 2-3 plastic bottles
	('toothpaste_tabs', 100, 300),          -- replaces ~3 tubes
	('bamboo_toothbrush', 20, 60),          -- replaces one plastic brush
	('refill', 20, 60),                     -- packaging avoided, by container size: 20-50
	('glass_pack', 30, 90),                 -- plastic jar or bottle avoided
	('paper_metal_pack', 10, 30);           -- plastic pack avoided: 10-20
--> statement-breakpoint
-- Products listed before types existed: the type that category and packaging already say. Reusables and household products stay
-- 'other' until their owner picks the type (wrap, container, ...), because nothing listed says which it is.
UPDATE "products" SET "product_type" = CASE
	WHEN "category" = 'bulk_refill' OR "packaging_type" = 'refill' THEN 'refill'
	WHEN "category" = 'soap_cosmetics' AND "packaging_type" IN ('none', 'paper', 'metal') THEN 'soap_bar'
	WHEN "category" IN ('food_glass_paper_metal', 'soap_cosmetics') AND "packaging_type" = 'glass' THEN 'glass_pack'
	WHEN "category" = 'food_glass_paper_metal' AND "packaging_type" IN ('paper', 'metal') THEN 'paper_metal_pack'
	ELSE 'other' END;
