-- Warden now starts at 5 points (was 3); the other ranks stay at 1 / 10 / 25 / 50 (Pola, 2026-11-18).
-- A Bee Guardian's rank is worked out from its milestone number, so Warden cards minted at 3 points are renumbered to 5:
-- nobody who holds Warden loses it. Nothing else moves. (No one can hold both 3 and 5: 5 did not exist as a milestone before.)
UPDATE nft_mints SET milestone = 5 WHERE milestone = 3;
