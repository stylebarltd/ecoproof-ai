CREATE TABLE "place_invites" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"role" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by" text
);
--> statement-breakpoint
CREATE TABLE "place_members" (
	"place_id" text NOT NULL,
	"member_key" text NOT NULL,
	"role" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"added_by" text,
	CONSTRAINT "place_members_pkey" PRIMARY KEY("place_id","member_key")
);
--> statement-breakpoint
CREATE INDEX "place_invites_place" ON "place_invites" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "place_members_key" ON "place_members" USING btree ("member_key");--> statement-breakpoint
-- Every self-serve place's current owner becomes its first member.
INSERT INTO "place_members" ("place_id", "member_key", "role") SELECT "id", "owner", 'owner' FROM "stamp_places" WHERE "owner" IS NOT NULL ON CONFLICT DO NOTHING;
