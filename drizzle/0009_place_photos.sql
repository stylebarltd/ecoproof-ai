CREATE TABLE "place_photos" (
	"id" text PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"position" integer NOT NULL,
	"bytes" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "place_photos_place" ON "place_photos" USING btree ("place_id","position");