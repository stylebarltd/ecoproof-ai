ALTER TABLE "stamp_places" DROP CONSTRAINT "stamp_places_kind";--> statement-breakpoint
ALTER TABLE "stamp_places" ADD COLUMN "sells_online" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Online shops become eco shops with the online channel (lib/placeKinds.ts). Their proofs and stamps are untouched.
UPDATE "stamp_places" SET "kind" = 'eco_shop', "sells_online" = true WHERE "kind" = 'online_shop';--> statement-breakpoint
ALTER TABLE "stamp_places" ADD CONSTRAINT "stamp_places_kind" CHECK ("stamp_places"."kind" IN ('cafe', 'restaurant', 'hotel', 'eco_shop'));
