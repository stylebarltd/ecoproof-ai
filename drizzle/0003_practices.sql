CREATE TABLE "place_practices" (
	"place_id" text NOT NULL,
	"practice_id" text NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_practices_pkey" PRIMARY KEY("place_id","practice_id"),
	CONSTRAINT "place_practices_status" CHECK ("place_practices"."status" IN ('yes', 'no', 'not_applicable'))
);
--> statement-breakpoint
CREATE TABLE "practice_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"practice_id" text NOT NULL,
	"reporter" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "stamp_places" ALTER COLUMN "kind" SET DEFAULT 'eco_shop';--> statement-breakpoint
ALTER TABLE "stamp_places" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "stamp_places" ADD COLUMN "also_cafe" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "practice_reports_place" ON "practice_reports" USING btree ("place_id","practice_id");--> statement-breakpoint
-- New place kind ids (lib/placeKinds.ts, data/practices.json): market stalls become eco shops.
UPDATE "stamp_places" SET "kind" = CASE "kind" WHEN 'shop' THEN 'eco_shop' WHEN 'market' THEN 'eco_shop' WHEN 'online' THEN 'online_shop' ELSE "kind" END WHERE "kind" IN ('shop', 'market', 'online');--> statement-breakpoint
ALTER TABLE "stamp_places" ADD CONSTRAINT "stamp_places_kind" CHECK ("stamp_places"."kind" IN ('cafe', 'restaurant', 'hotel', 'eco_shop', 'online_shop'));