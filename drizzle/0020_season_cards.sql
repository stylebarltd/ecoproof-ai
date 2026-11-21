ALTER TABLE "nft_mints" ADD COLUMN "design" text;--> statement-breakpoint
ALTER TABLE "nft_mints" ADD COLUMN "slot" text;--> statement-breakpoint
CREATE UNIQUE INDEX "nft_mints_owner_slot" ON "nft_mints" USING btree ("owner_key","slot") WHERE (slot IS NOT NULL);