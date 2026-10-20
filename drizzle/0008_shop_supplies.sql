CREATE TABLE "shop_supplies" (
	"place_id" text NOT NULL,
	"practice_id" text NOT NULL,
	"product" text NOT NULL,
	"url" text,
	CONSTRAINT "shop_supplies_pkey" PRIMARY KEY("place_id","practice_id")
);
--> statement-breakpoint
CREATE INDEX "shop_supplies_practice" ON "shop_supplies" USING btree ("practice_id");