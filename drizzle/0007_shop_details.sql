CREATE TABLE "ship_origins" (
	"id" serial PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"label" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"countries" text[] DEFAULT '{}'::text[] NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stamp_places" ADD COLUMN "website" text;--> statement-breakpoint
CREATE INDEX "ship_origins_place" ON "ship_origins" USING btree ("place_id");