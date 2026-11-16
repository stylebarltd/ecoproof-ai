CREATE TABLE "catalogue_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"main_key" text,
	"proposed_type" text,
	"proposed_pieces" integer DEFAULT 1 NOT NULL,
	"state" text DEFAULT 'open' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalogue_items_key" UNIQUE("place_id","key"),
	CONSTRAINT "catalogue_items_state" CHECK ("catalogue_items"."state" IN ('open', 'added', 'skipped'))
);
