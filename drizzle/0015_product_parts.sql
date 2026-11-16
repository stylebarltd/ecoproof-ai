CREATE TABLE "product_parts" (
	"product_id" text NOT NULL,
	"part_id" text NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "product_parts_pkey" PRIMARY KEY("product_id","part_id"),
	CONSTRAINT "product_parts_count" CHECK ("product_parts"."count" BETWEEN 1 AND 100)
);
--> statement-breakpoint
ALTER TABLE "product_parts" ADD CONSTRAINT "product_parts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_parts" ADD CONSTRAINT "product_parts_part_id_products_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;