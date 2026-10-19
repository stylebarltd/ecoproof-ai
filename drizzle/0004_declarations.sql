CREATE TABLE "practice_declarations" (
	"id" text PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"version" integer NOT NULL,
	"kind" text NOT NULL,
	"also_cafe" boolean NOT NULL,
	"answers" text NOT NULL,
	"checklist_hash" text NOT NULL,
	"score" integer NOT NULL,
	"stars" integer NOT NULL,
	"declared_by" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"hash" text NOT NULL,
	"signature" text,
	"claim_address" text,
	CONSTRAINT "practice_declarations_version" UNIQUE("place_id","version")
);
