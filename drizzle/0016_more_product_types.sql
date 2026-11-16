ALTER TABLE "impact_factors" DROP CONSTRAINT "impact_factors_product_type";--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_product_type";--> statement-breakpoint
ALTER TABLE "impact_factors" ADD CONSTRAINT "impact_factors_product_type" CHECK ("impact_factors"."product_type" IN ('reusable_wrap', 'reusable_container', 'reusable_cutlery_straw', 'reusable_bag', 'produce_bag', 'soap_bar', 'toothpaste_tabs', 'toothpaste_tabs_travel', 'plastic_free_floss', 'bamboo_toothbrush', 'laundry_pouch', 'dryer_balls', 'natural_sponge', 'refill', 'glass_pack', 'paper_metal_pack', 'other'));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_product_type" CHECK ("products"."product_type" IN ('reusable_wrap', 'reusable_container', 'reusable_cutlery_straw', 'reusable_bag', 'produce_bag', 'soap_bar', 'toothpaste_tabs', 'toothpaste_tabs_travel', 'plastic_free_floss', 'bamboo_toothbrush', 'laundry_pouch', 'dryer_balls', 'natural_sponge', 'refill', 'glass_pack', 'paper_metal_pack', 'other'));--> statement-breakpoint
-- New rows (2026-11-16), each "what it replaces x the plastic in that", low end of every range, CO2 = 3 g per g of plastic.
-- The weights are rough web figures (not measured by us yet); the use counts are our assumptions. See docs/eco-product-standard.md.
INSERT INTO "impact_factors" ("product_type", "plastic_g", "co2_g") VALUES
	('laundry_pouch', 420, 1260),          -- 300 loads = 6 detergent bottles of 50 loads, 70 g of plastic each
	('dryer_balls', 150, 450),             -- one year, 3 loads a week: about 150 dryer sheets, 1 g of polyester each
	('reusable_bag', 310, 930),            -- one year, one carrier bag a week: 52 bags of 6 g
	('produce_bag', 100, 300),             -- one year, one produce bag a week: 52 bags of 2 g
	('natural_sponge', 60, 180),           -- 3 foam scrub sponges of 20 g
	('plastic_free_floss', 10, 30),        -- per spool: one plastic floss case, about 11 g
	('toothpaste_tabs_travel', 2, 6);      -- one small plastic toothpaste tube, about 2 g empty
