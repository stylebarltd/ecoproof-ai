@AGENTS.md

# EcoProof (ecoproof.app)

## What this is
Eco passport app: customers scan a shop's QR, a parcel card or a verified-order
link, collect stamps and soulbound Bee Guardian NFTs; every claim writes a proof
on Solana. For sustainable shops, cafés, markets and online brands.
- App: https://ecoproof.app (the final domain since 2026-11-18, a PWA; DNS at Hetzner: A @ 216.198.79.1 + 64.29.17.1,
  CNAME www → 3bc5a83f7626c30d.vercel-dns-017.com.). The earlier domain ecoproofai.com (2026-11-15 to 18) stays attached
  to the Vercel project: plugin versions before 1.5.0 and cards printed in those days point at it. `proxy.ts` sends
  visitors on it (and on the www hosts) to ecoproof.app with path and query, but never API paths. ecoproof.superbee.me
  is dropped (Pola, 2026-11-18). Production links are always built on https://ecoproof.app (`lib/hosts.ts`,
  `appUrl()`); `APP_URL` is ignored there and only matters locally. Repo `stylebarltd/ecoproof-ai` and Vercel project
  `ecoproof-ai` keep their names. The separate showcase site (`../ecoproofai.stylebar.de`) is offline since 2026-11-15:
  the landing page and `/help#ai` explain the project.
- Won Best Use of Solana at the Superteam TH (Colosseum) hackathon, Chiang Mai 2026; public copy reads "Superteam TH (Colosseum), Chiang Mai 2026".
- The landing is written for customers and businesses alike (Pola, 2026-11-18): in shared sections like "How it works" no "your customers", no "they / their"; the hero and the business sections may still address owners.
- Hero (2026-11-18, Pola): written for customers ("Every eco choice earns a stamp. Real places, real proof.", rewritten 2026-11-18; primary "Open my eco passport", "Find eco places", one line for owners); no background pictures, kraft colour with the bee (`IslandHero.tsx`), copy left and the map right: `components/landing/MapPicture.tsx` draws a flat street map as SVG in the look of an everyday maps app (Pola asked for "Google map style"; no provider's tiles or branding) with one pin per kind of place and one called "Online"; a pin shows the kind's symbol and a small real QR code (to /map) side by side at the same size, and no pin is a link. An illustrated Stable Diffusion town (`art/v2/map`, seed 62003) was tried in the customers section first and replaced the same day ( the island plates in `public/landing/island/v4` and the notes about them below are history). Every "Join as a business" button is now "Add place" (still `/join`).
- Landing copy stays short and sells (Pola, 2026-11-17: "too much text"); readers are not blockchain people, so Solana is explained in plain words (hero tooltip `SolanaTip`, paragraph at `#why-chain`).
- Still in its hackathon-judging phase on **Solana devnet** (see Gotchas).

## Branches
- **`main` is the only working branch and it is production.** Commit straight to `main`; pushing it deploys the
  live app (Vercel), so ask Pola before every push. No feature branches or PRs.
- `v2` was the preview branch until 2026-11-15, when everything on it went live. It is no longer used; any other
  branch pushed to GitHub still gets a Vercel preview with its own preview DB.

### What is live
- Three claim doors → one stamp + one Solana proof each: place QR (`/c/<id>`),
  printed card (`/k/<code>`), verified WooCommerce order (`/o/<place>/<token>`).
  One endpoint for all: `app/api/claims` (streams NDJSON); one claim function: `lib/stamp.ts`.
- Stamp classes: verified purchase = 5 points, presence = 1 (`lib/stampClasses.ts`).
- Milestones count points; only milestones mint (soulbound compressed NFTs, Metaplex
  Bubblegum V2 + MPL-Core: `lib/milestones.ts`, `lib/nft.ts`, `lib/milestoneRules.ts`).
- Proofs: SHA-256 of the record as a Memo tx + a claim account ("one scan, one stamp").
  `app/api/verify/[id]` recomputes and compares.
- Passport (`components/PassportHome.tsx`), public passport `/u/[id]`, joined-places map, self-serve
  `/join`, share images (`next/og`), WooCommerce webhook ingest + plugin
  (`integrations/woocommerce/`, zipped by `scripts/plugin-zip.mjs` before dev/build).
- Drizzle migrations (`drizzle/`, `lib/schema.ts`); Vercel build runs `db:migrate` first.
- Accounts via Better Auth: Solana wallet, Google or Facebook (`lib/auth.ts`). Each social
  button only appears when its `*_CLIENT_ID`/`*_CLIENT_SECRET` are set. Google keys are set
  locally and on Preview; the Facebook (Meta) app is still Pola's to-do. Facebook isn't a
  trusted provider (unverified emails), so it never auto-joins an account by email.
- Shop owners and staff with a "My shop" dashboard; NFT claiming ("My Bee Guardians",
  a wallet connected later receives what was waiting); PDPA privacy page `/privacy`;
  desktop layouts.

- Eco stars (step 1): `data/practices.json` is the only source of place types, practices,
  points and the star scale; never hard-code them. Engine `lib/stars.ts` (pure, `npm test`),
  answers in `place_practices`, owner checklist `/shop/<id>/practices`, public page
  `/places/<id>`, star pins + filters on `/map`. Keep practice ids stable: answers are stored by
  id. Half stars: 5★ from 85 points, 4.5 from 78 (scale in the JSON); stars are always
  recomputed with today's scale, so changing it needs no republishing.
- Kinds: cafe, restaurant, hotel, eco_shop (`lib/placeKinds.ts`); only cafe/restaurant/hotel have
  stars. An eco shop has channels: in store (has `stamp_place_locations`, computed as `in_store`
  by `PLACE_COLS`) and/or online (`sells_online`: WooCommerce, parcel cards). There is no
  "online shop" kind any more.
- Shops show impact instead of stars (`lib/shops.ts`: plastic and CO2 summed from the shop's
  proofs, `components/ShopImpact.tsx`) on the place page, map sheet and dashboard. `/shops` lists
  every eco shop (the only way to find online-only ones), nearest first. Online shops set a
  website and shipping origins (`ship_origins`, `lib/shipping.ts`): one per warehouse, each
  serving listed countries or "everyone else". The visitor's country (`x-vercel-ip-country`,
  or `?country=US` to test; unknown locally) picks the origin used for "ships from" and distance.
- Place badge (`stampSvg()` in `lib/stampPlaces.ts`, served at `/api/stamp-places/<id>/stamp`): a rounded-square tile like the EcoProof
  mark, never round (Pola, 2026-11-16). With a logo: the logo on white inside a border of the place's colour; without: the kind's symbol on
  the colour. No name inside it (unreadable at 44px, and the name always stands beside it), so never crop it with `rounded-full`.
  The owner changes logo and tagline in the dashboard's "Logo and tagline" panel (`components/ProfilePanel.tsx`,
  `PUT /api/places/mine/<id>/profile`, rules in `lib/placeLogo.ts`); the name can't be changed yet.
- Postcard, rating box (Pola, 2026-11-18: the card must tell the customer the place is eco by EcoProof's measure): when the place has published practices (stars), the card shows under the headline "Rated by EcoProof" (no stars and no number on the card: Pola) and "For the eco practices <Place> has published and locked on Solana.", and drops the lead to make room (the card's height is fixed; check the print PDF after any text change). Pola asked for "approved eco by EcoProof"; the practices are self-declared and nobody inspects a place, so the wording is "rated", never "approved", "certified" or "verified", until there is a real review step (`stamp_places.status` has `under_review` but no process). Every landing picture with a postcard was re-made with it (`art/postcard`, `art/hero-scan`).
- Postcard (`components/Postcard.tsx`): the one printed card, used for a place's counter or tables (`/place/<id>`, "Print your postcard")
  only. An online shop's parcel cards (`/place/<id>/cards?batch=`, 20 single-use codes per batch) are `ParcelCard` in the same file: a business card (85 x 55 mm, ten on an A4 sheet, `parcelCardCss()`), with only the QR, the code, the headline, the shop's name, "no app, no sign-up", "works once" and the bee (Pola, 2026-11-18: a green shop must not put an A6 card in a parcel). The postcard It must explain EcoProof to someone
  who has never heard of it (Pola, 2026-11-16: nobody scans a QR without knowing what it is): headline, one sentence on EcoProof, the
  claim QR, three steps, the Bee Guardian. Sizes come from `postcardCss({ cols, rows, landscape })`: cards fill an A4 page edge to edge
  (4 x A6 or one A4 poster `?size=a4`). Every measure in the card is in `cqw` and the
  card has a fixed height, so new text must fit (a headline is two lines at most): check the print PDF. White card (little ink), text
  only for now; a generated background image is a possible next step.
- Photos: every place can show up to 3 (`MAX_PHOTOS`, `lib/photoRules.ts`): the place, its products, or screenshots of an online shop.
  The browser shrinks each to a 1600px JPEG (`lib/clientPhoto.ts`, which also drops the camera's location data); they are kept in
  Postgres (`place_photos`, `lib/placePhotos.ts`) because there is no file storage, and served with a permanent cache from
  `/api/places/<id>/photos/<photoId>` (a photo's id never gets new content). Only the owner changes them (dashboard "Photos" panel,
  `components/PhotosPanel.tsx`); the first is the cover on the map sheet and in `/shops`; the gallery is on `/places/<id>`. No captions.
- "Where to get it": shops tick practices their products help with (`shop_supplies`, one row per
  practice id; same-wording practices are one topic, `supplyTopics()`), with product and link.
  A café/restaurant/hotel checklist shows the 2 nearest shops under practices not answered Yes
  and in "Next step up" (`lib/supplies.ts`): distance to the shop's locations, or to the warehouse
  serving the owner's country (request country, not stored per place). Never affects stars.
- Journey map (2026-11-18, top of the passport: `components/PassportMap.tsx`, layout in `lib/journeyMap.ts`, tests in `tests/journeyMap.test.mjs`): since 2026-11-20 an illustrated game board (Pola: a green eco world, not a city; landscape on desktop, a separate portrait board on phones: `BOARD_LAND`, `BOARD_PORT`). The land is drawn in SVG and follows the trail: each rank's area is the ground around its part of the trail (`TERRAIN`: meadow, forest, hills, shore, summit; hills and shore swapped on 2026-11-20 with the new ranks, so the beach is the area at the coast; `guide.py` has the same order), decoration (`Deco`) and one painted landmark per area (`public/journey/v1/<terrain>.webp`, a new folder when a deployed picture changes; recipe `art/board/landmarks.py` + `cut.py`, seed 74002, no "honey" in the prompt or every picture gets a honey puddle) are placed by the layout where the trail leaves room, so a rank change moves everything. Round 4 (same day, Pola: "the landmarks / zones have to be the map", like a printed board with mountain ranges, forests and a river as masses; the board may become a real board game one day): a painted map under the SVG trail on both boards (`PAINTED` in `PassportMap.tsx`, `public/journey/v9/land.webp` and `port.webp`; Pola said go on the direction and on the card style, not a 3D look; the drawn ground, `Deco` and the v1 landmark cut-outs are only the fallback for a board without a painting). Recipe in `art/board/`: an `npx tsx` dump of `layoutJourney` → `layout.json`, `guide.py` (colour guide of the zones from the trail, plus one mask per zone), `paint.py land ill 0.58 75001` (img2img; keeps the trail in place, 0.7 moves it), a second pass `INIT=… TAG=b paint.py land ill 0.65 76001` (detail), then `zones.py` repaints single zones with their own prompt (hills and meadow 77001 at 0.8, shore 78002 at 0.92), because one prompt for the whole map leaves hills and shore as empty grass; last `compose.py` draws a short river, its bridge and the lake it ends in a little past the bridge by code (water of changing width with a lighter side, river and lake as one shape so no rim lies between them; Pola: dashes down the middle read as a blue street, a river that just ends in the rock looks wrong, and a lake with its own border looks cut off from the river), sets small painted objects on the land at one scale (`props.py`: palm, parasol, beach hut, straw hive hut, farmhouse, snow cabin, each alone on white with the landmarks' wording, seeds 74002 / 74003; without "standing on a small round patch of grass/sand" they tilt and throw long shadows, with "isometric" they stand on tiled blocks), each only where the trail, the stations, the water and the painted ground of its zone allow, and exports. The patch each object was painted on is cut off again in `compose.py` (`BASE`; Pola: a square grass plot under every farmhouse looks weird), and palms are four different renders (`PROP`, `TALL`), mirrored and sized by chance (Pola: seven identical palms look weird; nothing in an object's render may bring its own small palm, `ERASE`) (picks since the ranks moved to 1 / 10 / 20 / 35 / 50: `mapne_land_78001.png`, `mapne_port_78002.png`, both painted the same day: new `layout.json` and guides, `TAG=n paint.py land ill 0.58 75001` + second pass `TAG=nb … 0.65 76001`, `TAG=n paint.py port ill 0.48 75002` + second pass 0.48 76002 (the portrait first pass at 0.58 grew stray paths), then only the beach: `zones.py <fmt> <in> <out> shore:<seed>:0.6:sand` lays plain sand into the zone first, which gives a whole beach where a prompt alone gave patches of sand or a gridded strip; the river is no longer in the guide. Picks for the earlier ranks: `mapg_land_79002.png`, `mapb_port_ill_0.48_76001.png`). Before `compose.py` the earlier landscape painting was repaired by `fix.py 79002` (from `mapd_land_2.png`; Pola's review; written for that painting's coordinates, not used for the new one): the painter's path had dark cross strokes sticking out beside the app's road and a stray piece of path on the left where no trail runs, and the bays at the left and bottom edge were overlapping pools and beaches; strokes and stray path are taken out and one bay each is laid in by code, then one inpaint pass at 0.55 over just those spots (small masks with the shape laid in first work, unlike whole zones). Houses are kept off tree tops by colour (`compose.py`). Some places can be set by hand (`FIXED`, `AVOID`, `CLEAN` in `compose.py`; Pola's review of the earlier painting): neither board has the snow cabin now (on a peak, on grass and on sand it looked wrong; the mountains leave no flat place). On the phone board the beach hut has a fixed place on the upper beach and the lake on the right is brought back from the earlier painting (`WATER_BACK`): the sand step had covered its top and the hut stood in it. Desktop review of the new painting (`SCALE`, `UNDER`, `RIVER_SHIFT`): hive huts at half and farmhouses at half of their size, to fit the painted farmhouses; the beach stops about 190 px before the mountains, where the painting from before the sand step shows through (sand running into the rock was not nice and covered the painted lake); the river's mouth is moved up the left turn so the bridge is clear of the Vanguard station; no object may stand on painted boats. Repainting a zone is a lottery: further rounds on river, meadow and shore (with and without the guide's colours laid in first) all made the landscape map worse, and no painter kept a river. On the portrait board the second pass at 0.65 loses the trail; 0.48 keeps it. The painting is made for today's ranks and does not move with them. WebUI runs out of GPU memory after a few 1536px renders: the scripts reload the checkpoint and retry. Whole painted boards from Stable Diffusion without such a guide failed three ways (`art/board/gen.py`, `gen2.py`, `regions.py`): it paints one object well, not a wide map. Plain points are small stepping stones without a number on phones (Pola: they carry nothing); card tiles and stations keep their size. Trail coordinates are rounded in `curve()`: sin/cos differ in the last digit between Node and a browser and caused a hydration warning. Before that: a board-game trail with one tile per point from Start to the last rank's threshold, a stamp on every reached point that is not a station, a station per rank (the minted Bee Guardian, or a faded one), the bee on the current point (since 2026-11-20 the full-body bee with both legs, cut out of `art/v2/ranks/sentinel/sentinel_full.png` by `art/board/pin.py` → `public/journey/pin/v1/bee.webp`; Pola: not the rank card's cut-off bust; a version in today's Warden jacket exists as `art/video/input_warden_jacket_plain.png`), and "Ways to take a step" signposts (one per scan option, points from `POINTS_BY_KIND` / `POINTS_VERIFIED`). Everything follows `RANKS` and `lib/stampClasses.ts` (a rank change moves the stations by itself; tested with both the old and the new thresholds). Board spots (Pola 2026-11-19, same size as a plain tile): gift tiles at 24, 32, 45 (`DRAW_AT`) draw a random Season card, compass tiles at 5, 15, 28, 40, 53 (`EXPLORER_AT`; both moved on 2026-11-20 with the ranks, before that 21, 38, 45 and 3, 8, 14, 30, 53) give the Explorer card of the rank area they lie in; 53 (World Walker) is the last tile, so the trail runs three points past the Paragon station at 50; a rank station wins its spot. Also the line about every 5th stamp after the last tile (53 points; the count starts there, not at Paragon: Pola 2026-11-19) and the 20-card cap incl. the 5 rank cards (`AFTER_SUMMIT_EVERY_SCAN`, `MAX_NFTS`) shows the plan only: the app mints none of it yet. Rank stations have square frames (the NFT art is square). Pointing at or tapping a tile or station opens a note saying what happens there (`tipFor`). Motion (Pola 2026-11-19: the board should visibly live; classes `jm-*` in `app/globals.css`): tiles come in along the trail on every visit, the bee walks its last 5 steps (all new steps when points went up since this device last showed the map, `localStorage` `ecoproof:journey:step`), the bee bobs, the next goal breathes, tiles lift under a mouse; all off under reduced motion.
- Scan tab (Pola, 2026-11-20): scanning is its own place, `/scan` (`components/ScanHome.tsx`: "Scan a QR code" and "Photograph a receipt"), in the middle of the bottom tabs (raised) and in the desktop navbar; the two scan buttons at the top of the passport are gone. The board's "Ways to take a step" signs still open the scanners, but ask "Scan now?" first (easy to tap by accident).
- Passport page, owner view (Pola, 2026-11-20; `components/PassportView.tsx` with `owner`): the board is the page. Above it one compact strip (top rank picture, rank, points and progress, verified impact, "My Bee Guardians on Solana" / claim, share); below it a slim "Places you've been" row, the Season cards and a folded "All proofs" list (needed for stamps past the last tile, and readable without pointing). The big rank card, the rank row, the stamp collection box and the open proof trail are gone there: the board carries them. `Passport.steps` (`lib/passport.ts`) says which stamp filled which points; a reached tile's note names the place, date, kind and points of its stamp with a "See the proof on Solana" link (`/p/<id>`), and a reached rank station's note shows the card picture. A reached plain tile carries the badge of the place its stamp came from, not a tick (Pola: the board shows where the points came from, and a shop sees itself on a passport someone shares; an order's five tiles all carry the shop's badge), on the public passport too. The public passport (`/u/<id>`, `owner={false}`) still has the earlier sections: what a shared link and the share card show is to be discussed with Pola first.
- Season 1 in the app (built 2026-11-19, local only, not deployed): rules in `lib/seasonRules.ts` (20 designs, caps 650/325/160/75/40, `dueSlots`, weighted `pickLucky`, `seasonOpen`; tests `tests/season.test.mjs`), server in `lib/season.ts` (`recordSeason`, called from `afterProof` after `recordMilestones`). Season cards are rows in `nft_mints` with `design` (card key), `slot` (why: `draw:21`, `scan:2`, `explorer:warden`, `impact:sentinel`) and `milestone` = minus the card's code (migration `0020_season_cards`), so `mintPending` mints them like rank cards; `listNfts` returns rank cards only, `listSeasonNfts` the season ones (`Passport.season`). **The season is OFF unless `SEASON1_START` (ISO date) is set**: unset on Vercel, set in `.env.local` for testing. Draws use only the 10 lucky designs; Explorer cards come from the board's compass spots (slot `explorer:<rank>`), Impact cards need the rank and one verified purchase (Pola 2026-11-19). Pictures: `art/season1/export.py` → `public/nft/season1/` (+ `web/` 512 px WebP).
- `/` since 2026-11-20 (Pola): the homepage for visitors and signed-in customers alike (before that a signed-in customer got the passport there, so the homepage could not be reached once signed in); someone who runs a place (owner or staff) still lands on "My shop" there (`app/page.tsx`). The passport is `/passport`, "My shop" also `/shop`; `LandingNav` can say "My shop" for "Add place" (`owner`), used on pages an owner can see in the homepage's chrome; the homepage's "How it works" lead ends in "Read more" → `/help`; the installed app opens on the passport (`start_url` in `public/manifest.webmanifest`). How EcoProof works is told once, on the homepage (`#how`): `/help` is the page "Help" (`app/help/page.tsx`; it was `/about` until 2026-11-21, which redirects to it for good in `next.config.ts`, because order emails and every plugin version up to 1.5.0 link to `/about`; outside `(app)`, in the homepage's chrome like `/join`; Pola: help, FAQ and more details about how it works): questions first, then every way to collect a stamp in full, points and ranks, passport and NFTs, EcoProof AI, the proof with its honest limits and the test network, how to help EcoProof. No set-up guide for shops (that is `/join`). Its anchors `#faq`, `#collect`, `#ai`, `#points`, `#customers`, `#help`, `#proof`, `#test-network` are linked from elsewhere. The app's navigation has no "How it works" tab any more (bottom bar: Passport, Map, Scan, Shops). What follows describes the homepage; the sentence about three homes is history: signed out → the marketing landing page
  (`components/landing/`, design brief of 21 Oct 2026: kraft/paper tokens and Fraunces/Nunito/Bebas in `globals.css`, live counter from
  `lib/landingStats.ts`, pricing copy in `lib/landingContent.ts`, `LANDING_DEMO_PASSPORT` for "See a live passport"; without it the link reads "How the passport works" and goes to the guide); a customer → their
  passport; an owner or staff member → "My shop" (`components/MyShops.tsx`). The passport also lives at `/passport` (the only home of
  anonymous device passports; the nav's Passport tab, "View my passport" links and the landing nav's "Eco Passport" go there; that link turns
  leaf green and pulses when the device already has stamps, `components/landing/PassportNavLink.tsx`). App routes sit in the `app/(app)` route group,
  whose layout is the chrome (`components/AppShell.tsx`); the landing has its own nav. Art is one language, the cel-shaded NFT card set. The hero is the
  island world (`components/landing/IslandHero.tsx`, `NEXT_PUBLIC_LANDING_HERO=island`, default): seed 41002 plate from `art/v2/island/`
  (same Illustrious checkpoint as the cards), as two static images: the plate's own sky extended upward (`sky_static.py`) behind the copy, and
  the island cutout (`layers_cut.py`) under it; `export_web.py <folder> <ver>` → `public/landing/island/<ver>/`, a new folder per plate so
  caches bust; current `v4`. A scroll parallax was tried and dropped (not seen as moving, blurred the strip). The Bee Guardian cutout (`public/landing/bee.webp`, from `art/v2/ranks/sentinel/sentinel_card.png`) peeks in. The
  card-fan hero (`components/landing/HeroArt.tsx`, `public/landing/cards/v2/*.webp`, 2x of 300x420, from `art/v2/compositor/samples/`, SVG stamp
  rings) stays behind `NEXT_PUBLIC_LANDING_HERO=cards`. Paper grain and stamps are CSS. Buildings inpainted onto the island (`inpaint.py`,
  `v3_*.py`) never matched; the island stays as generated. The earlier SD flat-lay hero (`art/hero-r1/`, `art/v2/hero/`) was dropped for mixing two styles; the owner-door photos (`public/landing/doors/v7/`). Since 2026-11-18 every picture of a place shows the real A6 postcard, not a bare QR card (Pola): `art/postcard/` holds the recipe. `gen.py <scene> <seeds>` renders epicrealismXL scenes with one blank portrait card on a wooden stand (café 403, restaurant 403, hotel `reception2` 436, eco store 402 are the picks; a card on a hotel bedside table never stood up, so the hotel is a reception desk, and the card must stand upright and face the camera: a leaning one reads as a crooked print); the card is the app's own print of a local demo place (`brave --headless --print-to-pdf http://localhost:3000/place/<id>?size=a4`, `pdftoppm -r 150 -png`; local-only places demo-cafe, demo-restaurant, demo-hotel (named "Riverside Resort", without "Demo", since 2026-11-18: Pola), demo-eco-shop), `web_qr.py` swaps its QR for one to https://ecoproof.app, and `compose.py <cafe|restaurant|hotel|store>` finds the blank card and multiplies the postcard onto it → `out_<key>.png`. In use: café = `steps/v3/counter-card.webp`, restaurant = `doors/v7/coffee.webp`, hotel = `doors/v7/hotel.webp`; the store one (`out_store.png`) is made but not placed. The store door keeps the earlier receipt photo
  (from `art/doors/v2/`: epicrealismXL scenes with blank surfaces, `gen.py`, restaurant seed 202, hotel 211, store 203 with the hand repainted off the
  screen by `inpaint_hand.py` seed 306; the screen is placed from the phone's `glass` corners in `compose.py`: the glass is painted near-black, then the screenshot goes inside it with an even bezel and rounded corners; `compose.py` prints the real QR card, the SuperBee receipt and the EcoProof screen from `assets.mjs` onto them; the café tile uses `coffee.webp`) and partner logos (`public/landing/partners/`, from
  `art/partner/`) stay. Step images `public/landing/steps/v3/` (a new folder whenever a deployed picture changes, so caches bust): connect is the café postcard photo (above; the earlier QR-card composites live in `art/steps/connect/`), parcel-home is the "order arrived" picture in a kitchen (Pola, 2026-11-18: real life, not a mail-window mock; the parcel card is a business card and lies in the opened parcel): `art/steps/email/gen.py inbox 905` is the epicrealismXL scene (a table from above, an opened kraft parcel with a white sheet in it, a tablet on a stand; SD would not draw a blank business card on request, so the sheet is tinted to packing paper and the card laid on it); the card is the app's own print (`/place/demo-eco-shop/cards?batch=picture&token=<ADMIN_TOKEN>` to PDF, `pdftoppm -r 600` crop → `bizcard.png`; local-only card DEMO7PARCL), its QR swapped for one to https://ecoproof.app; `render.php client full` (widened to 1333px with sed) runs `EcoProof_Stamp::html` outside WordPress as a mail app → `tablet-land.html`, screenshot with headless Brave at 1333x1000, scale 2 → `tablet-land.png`; `compose.py` puts both in by hand-read corners → `out_home.png`. The earlier scene (`gen.py parcel 525`, upright tablet, `render.php client full portrait`) had a blank A6 card and was replaced. A living-room version (`gen.py sofa 513`) came first and was replaced; `render.php client` still makes the mail-window mock, proof is the "Proof on Solana" card cropped out of `art/steps/stamp/stamp.png` (888,95, 685x572), stamp is a screenshot from
  `../ecoproofai.stylebar.de/src/assets/screens/` (stamp collection), share is `/api/passport-card/<id>?format=square` rendered
  locally with `APP_URL=https://ecoproof.app` for the footer (local Warden passport `DGc2…`). Share images (`lib/beeCardOg.tsx`,
  `/api/passport-card`, `/api/card`) draw the NFT card set's frame (paper, rank-coloured rim, Caprasimo/Figtree) on kraft paper with the
  cel-shaded rank art from `public/share/art/` (640px, from `art/v2/compositor/samples/`) and the fonts from `public/share/fonts/`
  (static Figtree instances: the og renderer cannot read variable fonts), both traced in `next.config.ts`. The counter strip counts plastic *items* avoided, not kg (that is what
  the DB has). "Anyone can print a green badge" shows the newest verified record (`LandingStats.record`) with a live check
  (`components/landing/CheckRecord.tsx` → `/api/verify`); "Your impact page writes itself" shows the example shop (most verified purchases) with
  its numbers linking to `/places/<id>#proofs` (the proof list, `shopProofs()` in `lib/shops.ts`), and the live badge: `lib/badge.ts` builds the SVG,
  `/api/badge/<place>.svg` serves it (eco shops only, cached 5 min), `badgeEmbed()` is the snippet, shown only on the owner dashboard (`badge` in the activity API); the landing shows the badge image without its code. Below `FEW_ORDERS` (10, `lib/badge.ts`) verified orders the badge and the landing widget lead with the order count instead of the totals, so one big order can't look like inflation. With no example shop the widget shows dashes,
  never zeros. The hero (Pola, 2026-11-18, final after several photo heroes that "did not work") has no photo: the copy on kraft (for customers only: no line for owners and no counter or "early days" box in the hero, Pola took both out; "Add place" is in the navigation), and beside it three pictures in one (`MapPicture scanned`): the map of eco places with its QR pins, the hotel's A6 postcard on its wooden stand as a cut-out at the lower left (`art/hero-scan/cutout.py`, which rebuilds the photo's oversized, glossy wooden block as a slim holder of rough sawn, untreated wood (`wood.py` makes the plank and end-grain textures; Pola: the block was too big, too shiny, too deep, and the wood should look natural and rough), → `public/landing/hero/stand-stamp.webp` (the textures are warmed to honey in `cutout.py`), width in `.hero-stand`), and at the lower right a phone drawn in HTML (`ScanPhone`, size in `.scan-phone`) that has just scanned the Hotel pin's QR code (the code is framed, a dashed line runs to the phone) and shows "Stamp collected", the points, the proof and the Sentinel. Keep the scanned pin clear of the phone. Dropped the same day, recipes kept: a guest in a hotel room (`art/hero-room/`), a hotel desk photo with the postcard (`art/hero-scan/gen.py`, `clear.py`, `compose.py`). Section order: hero, the award line (partner logos and "founding partner" dropped 2026-11-15), customers ("I'm eco, and I have proof.", `#customers`, moved up under the hero on 2026-11-18; its picture is the passport phone mockup), "How it works" (`#how`, a carousel since 2026-11-18, `components/landing/HowItWorks.tsx`; it replaced "Live in three steps" and the Solana journey, which told the same steps: slide 1 "Find the QR code" shows three places to find it, each a picture with what a stamp there is worth, in this order: the café postcard photo (café / restaurant / hotel / resort), the eco shop door's receipt photo (a purchase in an eco shop), the parcel-arrived picture (an online order: parcel card and order email); points read from `lib/stampClasses.ts`; slide 2 "A few seconds on the phone" has the stamp picture, four steps worded for a visit and an order at once (no switch), "Watch it on a phone" (swaps the picture for the visit replay) and sharing; slide 3 "And it stays that way" is the plain-words "What is Solana, and why put a coffee stamp on it?" with the proof picture under it, the promises and honest limits, and carries `#why-chain`, which opens that slide; one scroll-snap row, as tall as the slide on show, with tabs and a next button that ends in "Join as a business". Pola wants slide 2 more interactive or animated later: talk first), "Anyone can print a green badge" (`#proof`: claim vs a record headlined "Unchanged since <date>", with the live check), business types, "Your public page writes itself" (`#impact`: badge, the shop impact widget, and a star card from `LandingStats.hospitality` with a Café / Restaurant | Hotel / Resort switch (`components/landing/HospitalityCard.tsx`; each a real place once one has published stars, else a demo place shown as a dashed specimen with unfilled stars; the hotel side adds "What guests see before they book"), after the real shop widget on phones), pricing, closing. Below `COUNTERS_FROM` proofs the hero shows an "early days" line instead of counter tiles; below 10 purchases the impact widget starts with the orders behind its numbers and highlights no figure. Phones get a "Try it: collect a demo stamp" button instead of the QR card. The phone replay (`components/landing/StampJourney.tsx`, `door` prop, loops, still under reduced motion) replays the real claim steps for a visit or an order; the scannable on-page QR card, the hash/memo tiles (`ChainFlow`) and the on/off-chain box were dropped as too much, too technical.
- `/join` lives outside `(app)` (`app/join/`, content in `components/landing/JoinFlow.tsx`) and wears the landing's journal chrome (`LandingNav page="join"`);
  sign-in there leads with Google/Facebook, the wallet sits under "Other ways to sign in".
- Points (`lib/stampClasses.ts`, table of 2026-11-20; before that a visit was 1 / 2 / 3 / 3 by kind of place): a visit is 1 everywhere (café, restaurant, hotel, an eco shop's till: a QR scan proves the same "I was here" in all of them; a place's QR works once a day per person, so a hotel stay counts every day and needs no rule about stays), the card in a parcel is 3 (`POINTS_CARD`, source `card`: the door for orders through Amazon, Shopee or Lazada, where no plugin can run; it proves a parcel arrived, not what was in it), a verified purchase is 5 (online order, or a receipt photographed in the shop). A till scan and the receipt of the same visit both count (1 + 5: Pola). One paper per parcel (Pola, 2026-11-20): a parcel of an order from the shop's own site (plugin) gets the parcel flyer, a parcel of a marketplace order gets a parcel card, never both (both would give 5 + 3 for one order). The app cannot check it; the dashboard says so (`components/ShopTools.tsx`). The flyer is `ParcelFlyer` in `components/Postcard.tsx`, printed at `/place/<id>/flyer` (online shops only): A6, four on an A4 sheet, in the postcard's styles, with no QR and no code, only "open your order email and tap Collect my stamp"; public like the postcard page, since it holds no secret.
  `pointsFor(source, kind)` everywhere; the passport query joins the place's kind.
  Recomputed on read, so old stamps follow today's table. Ranks (`RANKS` in `lib/milestoneRules.ts`): Sentinel 1, Warden 10, Guardian 20, Vanguard 35,
  Paragon 50 points (Pola, 2026-11-20: the old 1 / 5 / 10 / 25 / 50 gave five cards in the first ten points and three for one order; now a card comes about every 4 to 5 points, with the board spots: 1, 5, 10, 15, 20, 24, 28, 32, 35, 40, 45, 50, 53. `drizzle/0021_spread_rank_thresholds.sql` renumbers stored cards 25 → 35, 10 → 20, 5 → 10, top down, after 0019; applied by hand to the Docker DB; a holder keeps a card even below its new threshold). Paragon is the
  summit: no further card by points (the old "Paragon edition every 50 points" is gone; editions already minted stay). `drizzle/0019_new_rank_thresholds.sql`
  renumbers the stored `nft_mints.milestone` of Warden cards minted at 3 points to 5, because a card's rank is read from its milestone: nobody loses Warden.
  **Written 2026-11-18, local only, not deployed**: the migration runs on the next deploy's build (`vercel.json`), and until the new code is live the old code would
  read a renumbered Warden (5) correctly too (3 and 5 are both Warden there), so there is no gap. Never run `npm run db:migrate` on this machine to try it: it reads
  `DATABASE_URL_UNPOOLED`, which is production (apply the SQL to the Docker DB by hand). Not built yet (memory `ecoproof-points-system`):
  the Season cards (random card every 8 points, the 20 designs), the random card on every 5th scan after Paragon, the cap of 20 NFTs per passport.
  The landing shows three doors: Café / Restaurant (one door, a small café/restaurant switch is planned), Hotel / Resort, Eco store.
- Rank personas (decided 22 Oct 2026): five different bees, one per rank, in `art/v2/ranks/personas/` (img2img from the former Sentinel card at
  denoise 0.72 to 0.78, `gen2.py`; ladder, prompts and seeds in its `seeds.json`; chosen renders `pick/<rank>.png`, hue-keyed card masters via `cards.py`).
  Sentinel is the young hooded bee (peace sign), Warden the former Sentinel (thumbs up), Guardian goggles (high five), Vanguard bandana (fist pump),
  Paragon spectacles and staff. Renders carry no badges or items (the compositor adds them), no visible abdomen, natural antennae, fuzzy ink arm bands,
  a fuzz head edge with no outline. Live cards: `art/v2/ranks/<rank>/<rank>_card.png` (old ones kept as `_prev`). After a card change run `node art/v2/compositor/nft-art.mjs`
  (static `public/nft/<rank>.png`: fixed background, rank aura, no collar badge, no item; Pola, 2026-11-18: no circles on the rank cards, so `pickTraits` in `compose.mjs` gives rank cards `item: "none"` and `badge: "none"`, achievements keep theirs for now) then `npx tsx scripts/nft-webp.ts`, and `node art/v2/compositor/samples.mjs`
  (sample cards; `public/share/art/` is the 640px copy of their `_art.png`, `public/landing/cards/v2/` the 600x840 copy of the five rank samples; then `node art/steps/stamp/compose.mjs` for the "How it works" stamp picture, which shows the Sentinel card, and copy its output to `public/landing/steps/v3/stamp-clean.webp`). The gold outline aura is built from each card's own alpha in `compose.mjs`. `art/v2/ranks`, `layers` and `compositor` are not in git (300 MB of renders); only `personas/pick` and the scripts are.
- Season 1 cards (plan agreed with Pola 2026-11-18, not built into the app; art test only): 20 special cards, 4 per rank, full scenes, no circles, badges or item bubbles; per rank 2 "lucky" cards with a new guest bee and 2 "challenge" cards with the rank's own bee in a new pose. Recipe `art/season1/`: `persona.py <card> <denoise> seeds` (img2img from the Sentinel card on dusty blue, as the rank personas; 0.78 for a new bee, 0.68 to keep the Sentinel), `fix.py` (inpaint a wrong part), `scene.py <card> seeds` (the scene without a bee, txt2img), `compose.py` (hue-key the bee, stand it in the scene; `PICKS` holds the choices) → `<card>.png`, `node art/season1/cards.mjs` (the card frame around each picture, sample values; uses `art_file` and `subtitle` in `art/v2/compositor/compose.mjs`) → `cards/<card>.png`, `cards/_overview.png`. What failed: img2img from the finished rank picture at 0.84 (generic cartoon bees), and pasting the unchanged rank bee on every scene (same pose everywhere, Pola wanted own poses). All 20 cards exist as a first pass (2026-11-19): `cards/_<rank>.png` shows each rank.s four; `_batch.sh` drew five bees and four scenes per card, the picks are in `compose.py`. Weak spots are listed in the chat of that day (several challenge bees kept their rank pose instead of the asked one; World Walker uses a sea-from-above scene because no map scene worked).
- Declarations: `place_practices` is the owner's private draft. "Publish…" (warning sheet, at
  most once a day, refused if unchanged) freezes it into `practice_declarations` (versions, never
  edited) and writes its SHA-256 to Solana (memo + claim account keyed on its id,
  `lib/declarations.ts`). Map, place page and dashboard read only the latest declaration, and only
  if it matches the place's current type. Pending proofs are written on view
  (`/api/declarations/<id>/anchor`); demo places get a seeded declaration.

- Receipt door (2026-11-15, in-shop only; `lib/receipts.ts`): "Scan a receipt from an eco shop" in the passport
  (`components/ReceiptScanner.tsx`) photographs a receipt, downsizes it, and POSTs it with the position to
  `/api/receipts/read`. The server picks the candidate eco shops within 400 m of the shopper, has Claude
  (`RECEIPT_MODEL`, vision + JSON schema) read merchant, date (Buddhist years converted), number, total and item
  lines and pick the matching shop among the candidates (a name-overlap guard behind it), rejects receipts older
  than 7 days or already claimed (DB `receipt_fp` and the chain), sorts the lines with `matchItems` (the shop's
  declared products, else an AI estimate), needs at least one sustainable item, and returns a review with a signed token
  (HMAC, 15 min, bound to the passport). The photo is never stored. `POST /api/claims { receiptToken, lat, lng }`
  → `claimReceipt()` re-checks the position (place `gps_radius_m`, default 150 m, against the matched location) and
  goes through `claimStamp` with `source: "receipt"` and the receipt's own fingerprint (number + date + total,
  `receiptFingerprint`). `stampClass("receipt")` is verified: 5 points, impact line, same cards and proofs as an
  order. Not built: at-home scans (3 pts) and the per-shop item memory.
- Eco product standard (2026-11-16, eco shops; `docs/eco-product-standard.md`, a copy of the Claude Doc Pola keeps): a shop lists what it sells
  without plastic (`products`, keyed on the receipt name, plus `product_aliases`); fixed lists in `lib/productRules.ts`. **Products never
  carry impact numbers and no owner route accepts any**: impact is looked up in `impact_factors` by product type (change it only by migration). Setup wizard `/shop/<id>/products`
  (`components/ProductSetup.tsx`, `lib/products.ts`): sample receipt (skippable, stored in `receipt_samples`, nothing reads it yet),
  declaration (required before any product), then categories, products, refill, each with "Skip for now". `lib/match.ts` matches a receipt
  line: exact name, alias, then word overlap above 0.8 (`lib/matchText.ts`); `claimReceipt` records every line in `receipt_lines`, and the
  unmatched ones are the dashboard's "Confirm these products?" queue (`components/ProductsPanel.tsx`). Reports: "Not true?" on the shop's
  page goes through `/report/<place>?product=<id>` into `product_reports`; we confirm in `/admin/reports`; two confirmed reports set the
  product to `removed` (no matching, no re-adding). Aliases ("Also printed as" on a product, or "It's the same product" in the queue) let
  several printed names (Thai and English, the till's short name) be one product; a name is unique per shop across receipt names and
  aliases. The customer photo path for unknown lines isn't built.
- Impact counting (switched 2026-11-16): **grams of plastic and grams of CO2 avoided, for receipts and online orders alike**
  (`matchItems` in `lib/order.ts`). `impact_factors` is keyed by **product type** (`PRODUCT_TYPES` in `lib/productRules.ts`: the rows of
  the standard's section 5, seeded row for row in `drizzle/0014`, low end of a range; `other` has no row and counts nothing). A product
  has a category (grouping), a packaging (what it declares), a type (picked by the owner in soap/cosmetics, reusables and household;
  elsewhere it follows from category + packaging, `typeOf`) and `pieces` per pack (1-100): a line counts factor x pieces x quantity
  (`impactSource: "shop"`). An unlisted line is estimated: the AI (`CATEGORY_MODEL`) reads the type off the name, counts one piece
  (`"ai"`, shown as "EcoProof AI estimate") and the line waits in the owner's queue (orders too, via `ingestOrder`); a removed product or
  a dismissed wording counts nothing. A new kind of product needs a row in the standard first, then a migration: never a per-shop number.
  Online shops: an order line also matches by the shop's own product number, listed as a name or alias `woo:<product id>` or
  `woo:<product id>:<variation id>` (`shopKeys` in `lib/match.ts`; the Woo webhook's `product_id` / `variation_id`), so translated
  names and design variations find the product. `GET /api/places/<id>/products` is the public list with what each product counts
  (a shop's own site reads it: superbee.me builds its product pages from it). A long list goes in through "Import a list" in the
  wizard: a CSV file, one product per row (`lib/productCsv.ts`: name, kind, pieces, packaging, other names, contains; the wizard offers a
  template; a .json list still works), sent on to `importProducts`; re-importing keeps what is there and adds the rest.
  Catalogue sync (plugin 1.4.0, `lib/catalogue.ts`, `catalogue_items`): the plugin's "Send my products to EcoProof" posts names,
  numbers and variation labels to `/api/woo/catalogue/<place>` (signed like orders; again a minute after a product save). The AI
  proposes type and pieces (one row per variation when the variations are pack sizes; a translation follows its `main`), and the
  owner confirms in the wizard ("From your shop": tick, correct, say the packaging, add). A proposal is never a declared product.
  Bundles (`product_parts`): a product can contain counts of other listed products and then counts as their sum (no nesting; a part
  removed after reports stops counting inside it).
  Records keep the old columns: `packaging_g` = grams of plastic, `co2_kg` to the gram, `plastic_items` always 0 (it is part of the
  proof's hash input, so it stays). Everything shown goes through `grams()` / `impactParts()` in `lib/impact.ts`; types carry
  `plasticG`. The first engine (per-product numbers, `product_impacts`, the SuperBee catalogue, `/api/woo/products`) was deleted on 2026-11-16. WooCommerce plugin 1.3.0 has no
  product screen and prints "Your order avoids about 230 g of plastic and 690 g of CO₂" from `impact.plasticG` / `co2Kg`; hive needs
  that version installed (older ones read fields that no longer exist and show no impact sentence worth reading).

### Plans, not built yet (agreed with Pola, in this order)
- Move to Solana mainnet before real businesses and customers are invited (Pola agreed 2026-11-20; not started). First: (1) abuse limits, since every fake scan then costs money (durable rate limits, protection against many wallets); (2) a cost check per stamp and per mint against real volumes; (3) a decision on the devnet records and NFTs, which do not move across (write the existing stamps again on mainnet, or start fresh; production was emptied on 2026-11-15, so little is lost). It needs a funded mainnet wallet for the server, which Pola sets up: never ask for or handle its key. Until then the app says "test network", not "devnet", and explains it at `/help#test-network` (the passport's "Recorded on Solana · test network" links there).
- Receipt scanning at home (3 pts) and the per-shop item memory that builds itself from confirmed scans.
- "Visitor-verified" (not "certified"): after a QR stamp, ask about one published practice
  (Yes / No / Didn't notice); a No becomes a report (`practice_reports`); badge after 3 visitors
  on 3 different days, shown with its count; any answer earns the reward, not only Yes.

## Naming and ownership (Pola, 2026-11-18)
- The brand is **EcoProof**, the address **ecoproof.app**; the wordmark is plain "EcoProof", one colour.
  **EcoProof AI** is only the name of the part that reads receipts and estimates or proposes products (receipt
  scanner, "EcoProof AI estimate", catalogue proposals from WooCommerce and later Shopify, `/help#ai`). Everywhere
  else write "EcoProof".
- Logo (Pola, 2026-11-20): a round passport stamp, checkmark whose long stroke becomes a leaf, drawn by `art/logo/rings.py` (variant 5: rough
  edges, heavier at the bottom, pin holes; the outer ring has no breaks and no chips, the inner ring six breaks). Never edit the SVGs by hand:
  the script writes `public/logo.svg` (favicon, cream tile), `public/logo-mark.svg` (header, `LogoTile` in `components/Logo.tsx`),
  `public/landing/ecoproof-stamp.svg` (back of the landing's rank cards) and `lib/logoMark.ts` (PNG app icons, `app/icons/[size]`). After a
  change rebuild `app/favicon.ico` (16/32/48 px from `public/logo.svg`). The A6 postcard prints the stamp too (brand row and the "Rated by EcoProof" box, `.pc-logo` / `.pc-seal` in `components/Postcard.tsx`).
  The old leaf mark (`LeafMark`) is still the Passport tab's symbol and the sage tile on the parcel card (so also in the parcel-home picture) and the `/api/card` share image.
- Explainer video (2026-11-20, `art/video/`, untracked; v1 in `explainer/out/` and `~/Documents/ecoproof_explainer_v1.mp4`): 9:16, 27 s, the Warden
  narrates (Kokoro `bm_george`, `voice.py`). Built with the `../superbee-hero` recipe: `redraw.py` puts today's Warden jacket on the full-body bee
  (`art/v2/ranks/sentinel/sentinel_full.png`; pick seed 73002), `motion.py` makes Wan 2.2 clips in ComfyUI (prompts steer loosely: render two seeds per
  shot and pick; "wow" never worked), `key.py` cuts the bee out, `explainer/` is the Remotion project (scenes in `src/Explainer.tsx`, clip per scene in
  `src/shots.json`, scene lengths follow the voice lines). A1111 and ComfyUI do not fit in the GPU together: `unload-checkpoint` before Wan,
  `reload-checkpoint` after (else A1111 answers 500). No music yet; the Remotion company licence question is still open.
- On-chain memos read `EcoProof proof v1: <hash>` and `EcoProof declaration v1: <hash>`; verification also accepts
  the "EcoProof AI …" wording written before the rename (`proofMemos`, `declarationMemos`): never drop those.
  The devnet NFT collection was created as "EcoProof AI Bee Guardians"; its metadata now serves "EcoProof Bee Guardians".
- EcoProof is run by **stylebar ltd**, Thailand; privacy contact privacy@ecoproof.app. SuperBee is a shop that
  uses it, not its maker: no "built by SuperBee", no founding-partner line, no SuperBee example addresses.

## Stack
Next.js 16 (App Router; read `node_modules/next/dist/docs/` first, see AGENTS.md) ·
React · Tailwind · `@solana/web3.js` (devnet) · Metaplex · PostgreSQL (Neon) via `pg`
(+ Drizzle) · Anthropic SDK (`CATEGORY_MODEL`, `RECEIPT_MODEL`) · Leaflet.
Hosting: Vercel team "stylebar" (Hobby), project `ecoproof-ai`.

## Commands
```bash
npm install
cp .env.example .env.local     # fill in the values
npm run dev                    # http://localhost:3000
npm run build
npm run lint
npm test                       # star engine tests (node --test, no extra deps)
npm run db:generate            # new migration from lib/schema.ts
npm run db:migrate             # apply migrations (reads .env.local)
npx tsx scripts/nft-setup.ts   # one-time: Merkle tree + NFT collection
npx tsx scripts/demo-qr.ts     # regenerate the demo QR codes
npx tsx scripts/nft-webp.ts    # 512px copies of the rank artwork in public/nft/
```
Local DB: Docker Postgres container `ecoproof-pg` (port 5433), database `ecoproof`.

## Gotchas
- **Demo places are gone (2026-11-15):** the judges' no-GPS demo places (demo-cafe, demo-restaurant,
  demo-coffee, demo-hotel) were set to status `suspended` in production and dropped from
  `data/stamp-places.json`, which is now empty: production was emptied on 2026-11-15 and every place, SuperBee included,
  is set up through /join (the WooCommerce plugin on hive then needs the new place id and secret). Nothing may be collected by tapping any more. Remaining pre-launch
  hardening: durable rate limits, Sybil wallets, mainnet.
- **Vercel blocks deploys whose commit author isn't on the team.** Commit as
  `echo@stylebar.de`, not the global `boom@stylebar.de`. Check `git log -1 --format=%ae`.
- **`DATABASE_URL_UNPOOLED` in `.env.local` points at production.** Never use it locally.
  Previews read `PREVIEW_DATABASE_DATABASE_URL` and refuse to fall back to production.
- Previews build their links (QR, cards, order links, webhooks) from `VERCEL_BRANCH_URL`, production from
  `PRODUCTION_URL`; `APP_URL` only counts locally (`appUrl()` in `lib/nft.ts`). The plugin has no URL field either:
  ecoproof.app is built in (plugin 1.5.0; earlier versions have ecoproofai.com), `ECOPROOF_URL` in wp-config.php overrides it for local dev. The dashboard shows a
  shop only place id and secret, plus a "Connect your WooCommerce shop" card until the first order arrives.
- Port 5432 to Neon may be blocked from Pola's machine; use the Neon console SQL editor.
- **`SESSION_SECRET` is required in production** (>= 32 chars); locally a dev-only
  fallback is used. `ADMIN_TOKEN` (>= 16 chars) enables `/admin` and the admin API.
  Keep `.env.example` in sync when code reads a new variable.
- `next dev` rewrites `AGENTS.md`; that diff is expected.
- A phone on the home network opens the dev server at http://192.168.1.41:3000. Next.js answers 403 for its own scripts and styles to any host that is not listed in `allowedDevOrigins` (`next.config.ts`), and the page then arrives unstyled and dead; the list has `192.168.1.41` and `192.168.1.*`. If the machine's address changes, add it there.
- After replacing an image under `public/`, `next dev` keeps serving the old optimized copies from `.next/dev/cache/images`
  (not `.next/cache/images`); delete that folder, or use a new file name.
- Impact numbers are estimates from `lib/impact.ts`, not audited data. Keep the
  README's "Honest limits" honest in anything public.

## Reference docs
- `README.md`: product, claim doors, layout, honest limits
- `SUBMISSION.md`: hackathon submission
- `docs/woocommerce/`: shop connection guide, local staging recipe
