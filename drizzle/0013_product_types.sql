ALTER TABLE "impact_factors" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "impact_factors" CASCADE;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_type" text DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "pieces" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_product_type" CHECK ("products"."product_type" IN ('reusable_wrap', 'reusable_container', 'reusable_cutlery_straw', 'soap_bar', 'toothpaste_tabs', 'bamboo_toothbrush', 'refill', 'glass_pack', 'paper_metal_pack', 'other'));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_pieces" CHECK ("products"."pieces" BETWEEN 1 AND 100);