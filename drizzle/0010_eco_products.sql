CREATE TABLE "impact_factors" (
	"category" text NOT NULL,
	"packaging_type" text NOT NULL,
	"plastic_g" integer NOT NULL,
	"co2_g" integer NOT NULL,
	CONSTRAINT "impact_factors_pkey" PRIMARY KEY("category","packaging_type"),
	CONSTRAINT "impact_factors_category" CHECK ("impact_factors"."category" IN ('food_glass_paper_metal', 'bulk_refill', 'soap_cosmetics', 'reusables', 'household')),
	CONSTRAINT "impact_factors_packaging_type" CHECK ("impact_factors"."packaging_type" IN ('glass', 'paper', 'metal', 'none', 'refill'))
);
--> statement-breakpoint
CREATE TABLE "product_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"receipt_name_variant" text NOT NULL,
	CONSTRAINT "product_aliases_variant" UNIQUE("product_id","receipt_name_variant")
);
--> statement-breakpoint
CREATE TABLE "product_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_reports_reporter" UNIQUE("product_id","reporter_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"receipt_name" text NOT NULL,
	"display_name" text NOT NULL,
	"category" text NOT NULL,
	"packaging_type" text NOT NULL,
	"replaces" text,
	"photo_url" text,
	"source" text NOT NULL,
	"status" text DEFAULT 'declared' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_receipt_name" UNIQUE("place_id","receipt_name"),
	CONSTRAINT "products_category" CHECK ("products"."category" IN ('food_glass_paper_metal', 'bulk_refill', 'soap_cosmetics', 'reusables', 'household')),
	CONSTRAINT "products_packaging_type" CHECK ("products"."packaging_type" IN ('glass', 'paper', 'metal', 'none', 'refill')),
	CONSTRAINT "products_source" CHECK ("products"."source" IN ('owner', 'customer_photo', 'order_webhook')),
	CONSTRAINT "products_status" CHECK ("products"."status" IN ('declared', 'confirmed', 'reported', 'removed'))
);
--> statement-breakpoint
CREATE TABLE "receipt_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"claim_id" text,
	"raw_text" text NOT NULL,
	"price" double precision,
	"matched_product_id" text,
	"confidence" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_aliases" ADD CONSTRAINT "product_aliases_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reports" ADD CONSTRAINT "product_reports_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_lines" ADD CONSTRAINT "receipt_lines_matched_product_id_products_id_fk" FOREIGN KEY ("matched_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receipt_lines_claim" ON "receipt_lines" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "receipt_lines_unmatched" ON "receipt_lines" USING btree ("place_id","created_at") WHERE (matched_product_id IS NULL);--> statement-breakpoint
-- Seed: the first-pass table in section 5 of docs/eco-product-standard.md, CO2 = 3 g per g of plastic. That table is per product type;
-- here it is per category and packaging. Where a pair covers several of its rows or a range, the lowest figure is used, so nothing is
-- overstated. A pair the table doesn't cover has no row and counts nothing.
INSERT INTO "impact_factors" ("category", "packaging_type", "plastic_g", "co2_g") VALUES
	('food_glass_paper_metal', 'glass', 30, 90),   -- "Glass instead of plastic"
	('food_glass_paper_metal', 'paper', 10, 30),   -- "Paper or metal instead of plastic", 10-20
	('food_glass_paper_metal', 'metal', 10, 30),
	('bulk_refill', 'refill', 20, 60),             -- "Refill into own container", 20-50
	('bulk_refill', 'none', 20, 60),
	('soap_cosmetics', 'none', 80, 240),           -- "Soap / shampoo bar"
	('soap_cosmetics', 'paper', 80, 240),
	('soap_cosmetics', 'metal', 80, 240),
	('soap_cosmetics', 'glass', 30, 90),           -- "Glass instead of plastic" (toothpaste tabs in a jar would be 100)
	('soap_cosmetics', 'refill', 20, 60),          -- "Refill into own container"
	('reusables', 'none', 50, 150),                -- lowest of wrap 150, container 500, cutlery / straw 50
	('reusables', 'paper', 50, 150),
	('reusables', 'metal', 50, 150),
	('reusables', 'glass', 50, 150),
	('household', 'none', 20, 60),                 -- "Bamboo toothbrush": the table's only household-type row
	('household', 'paper', 20, 60),
	('household', 'metal', 20, 60);
