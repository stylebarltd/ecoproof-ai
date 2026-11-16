CREATE TABLE "product_photos" (
	"product_id" text PRIMARY KEY NOT NULL,
	"bytes" "bytea" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_samples" (
	"place_id" text PRIMARY KEY NOT NULL,
	"bytes" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "receipt_lines" ADD COLUMN "dismissed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "stamp_places" ADD COLUMN "product_categories" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "stamp_places" ADD COLUMN "refill" boolean;--> statement-breakpoint
ALTER TABLE "stamp_places" ADD COLUMN "products_declared_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "product_photos" ADD CONSTRAINT "product_photos_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;