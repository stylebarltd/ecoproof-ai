-- The ranks are spread out (Pola, 2026-11-20): Sentinel 1, Warden 10 (was 5), Guardian 20 (was 10), Vanguard 35 (was 25), Paragon 50.
-- A Bee Guardian's rank is worked out from its milestone number, so cards minted under the old thresholds are renumbered: nobody loses a rank.
-- From the top down, so no card passes through a number another rank still holds. Season cards (negative milestones) and Paragon cards do not move.
UPDATE nft_mints SET milestone = 35 WHERE milestone = 25;--> statement-breakpoint
UPDATE nft_mints SET milestone = 20 WHERE milestone = 10;--> statement-breakpoint
UPDATE nft_mints SET milestone = 10 WHERE milestone = 5;
