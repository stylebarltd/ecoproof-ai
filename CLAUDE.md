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
  the landing page and `/about#ai` explain the project.
- Won Best Use of Solana at the Superteam TH (Colosseum) hackathon, Chiang Mai 2026; public copy reads "Superteam TH (Colosseum), Chiang Mai 2026".
- The landing is written for customers and businesses alike (Pola, 2026-11-18): in shared sections like "How it works" no "your customers", no "they / their"; the hero and the business sections may still address owners.
- Hero (2026-11-18, Pola): written for customers ("Your eco choices, proven. Verified, not claimed.", primary "Open my eco passport", "Find eco places", one line for owners); no background pictures, kraft colour with the bee (`IslandHero.tsx`), copy left and the map right: `components/landing/MapPicture.tsx` draws a flat street map as SVG in the look of an everyday maps app (Pola asked for "Google map style"; no provider's tiles or branding) with one pin per kind of place and one called "Online"; a pin shows the kind's symbol and a small real QR code (to /map) side by side at the same size, and no pin is a link. An illustrated Stable Diffusion town (`art/v2/map`, seed 62003) was tried in the customers section first and replaced the same day ( the island plates in `public/landing/island/v4` and the notes about them below are history). Every "Join as a business" button is now "Add place" (still `/join`).
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
- Postcard (`components/Postcard.tsx`): the one printed card, used for a place's counter or tables (`/place/<id>`, "Print your postcard")
  and for an online shop's parcel cards (`/place/<id>/cards?batch=`, 20 single-use codes per batch). It must explain EcoProof to someone
  who has never heard of it (Pola, 2026-11-16: nobody scans a QR without knowing what it is): headline, one sentence on EcoProof, the
  claim QR, three steps, the Bee Guardian. Sizes come from `postcardCss({ cols, rows, landscape })`: cards fill an A4 page edge to edge
  (counter: 4 x A6 or one A4 poster `?size=a4`; parcels: 4 x A6 or 8 x A7 `?size=a7`). Every measure in the card is in `cqw` and the
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
- Three homes at `/` (`app/page.tsx`, decided on the server from the session): signed out → the marketing landing page
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
  card-fan hero (`components/landing/HeroArt.tsx`, `public/landing/cards/*.webp`, 2x of 300x420, from `art/v2/compositor/samples/`, SVG stamp
  rings) stays behind `NEXT_PUBLIC_LANDING_HERO=cards`. Paper grain and stamps are CSS. Buildings inpainted onto the island (`inpaint.py`,
  `v3_*.py`) never matched; the island stays as generated. The earlier SD flat-lay hero (`art/hero-r1/`, `art/v2/hero/`) was dropped for mixing two styles; the owner-door photos (`public/landing/doors/v2/`). Since 2026-11-18 every picture of a place shows the real A6 postcard, not a bare QR card (Pola): `art/postcard/` holds the recipe. `gen.py <scene> <seeds>` renders epicrealismXL scenes with one blank portrait card on a wooden stand (café 403, restaurant 403, hotel `reception2` 436, eco store 402 are the picks; a card on a hotel bedside table never stood up, so the hotel is a reception desk, and the card must stand upright and face the camera: a leaning one reads as a crooked print); the card is the app's own print of a local demo place (`brave --headless --print-to-pdf http://localhost:3000/place/<id>?size=a4`, `pdftoppm -r 150 -png`; local-only places demo-cafe, demo-restaurant, demo-hotel, demo-eco-shop), `web_qr.py` swaps its QR for one to https://ecoproof.app, and `compose.py <cafe|restaurant|hotel|store>` finds the blank card and multiplies the postcard onto it → `out_<key>.png`. In use: café = `steps/v2/connect.webp`, restaurant = `doors/v2/coffee.webp`, hotel = `doors/v2/hotel.webp`; the store one (`out_store.png`) is made but not placed. The store door keeps the earlier receipt photo
  (from `art/doors/v2/`: epicrealismXL scenes with blank surfaces, `gen.py`, restaurant seed 202, hotel 211, store 203 with the hand repainted off the
  screen by `inpaint_hand.py` seed 306; the screen is placed from the phone's `glass` corners in `compose.py`: the glass is painted near-black, then the screenshot goes inside it with an even bezel and rounded corners; `compose.py` prints the real QR card, the SuperBee receipt and the EcoProof screen from `assets.mjs` onto them; the café tile uses `coffee.webp`) and partner logos (`public/landing/partners/`, from
  `art/partner/`) stay. Step images `public/landing/steps/v2/` (a new folder whenever a deployed picture changes, so caches bust): connect is the café postcard photo (above; the earlier QR-card composites live in `art/steps/connect/`), email-home is the "order arrived" picture in a kitchen (Pola, 2026-11-18: real life, not a mail-window mock; with the A6 parcel card): `art/steps/email/gen.py parcel 525` is the epicrealismXL scene (an opened kraft parcel, a blank card leaning on it, a tablet on a stand); the parcel card is the app's own print (`/place/demo-eco-shop/cards?batch=picture&token=<ADMIN_TOKEN>` printed to PDF, 300 dpi, top-left card; local-only card DEMO7PARCL; `art/postcard/web_qr.py demo-parcel`); `render.php client full portrait` runs `EcoProof_Stamp::html` outside WordPress as a mail app for an upright tablet → `tablet.html`, screenshot with headless Brave at 750x1070, scale 2 → `tablet.png`; `compose.py` multiplies the card onto the card and lays the email on the glass (hand-read corners) → `out_home.png`. A living-room version (`gen.py sofa 513`) came first and was replaced; `render.php client` still makes the mail-window mock, proof is the "Proof on Solana" card cropped out of `art/steps/stamp/stamp.png` (888,95, 685x572), stamp is a screenshot from
  `../ecoproofai.stylebar.de/src/assets/screens/` (stamp collection), share is `/api/passport-card/<id>?format=square` rendered
  locally with `APP_URL=https://ecoproof.app` for the footer (local Warden passport `DGc2…`). Share images (`lib/beeCardOg.tsx`,
  `/api/passport-card`, `/api/card`) draw the NFT card set's frame (paper, rank-coloured rim, Caprasimo/Figtree) on kraft paper with the
  cel-shaded rank art from `public/share/art/` (640px, from `art/v2/compositor/samples/`) and the fonts from `public/share/fonts/`
  (static Figtree instances: the og renderer cannot read variable fonts), both traced in `next.config.ts`. The counter strip counts plastic *items* avoided, not kg (that is what
  the DB has). "Anyone can print a green badge" shows the newest verified record (`LandingStats.record`) with a live check
  (`components/landing/CheckRecord.tsx` → `/api/verify`); "Your impact page writes itself" shows the example shop (most verified purchases) with
  its numbers linking to `/places/<id>#proofs` (the proof list, `shopProofs()` in `lib/shops.ts`), and the live badge: `lib/badge.ts` builds the SVG,
  `/api/badge/<place>.svg` serves it (eco shops only, cached 5 min), `badgeEmbed()` is the snippet, shown only on the owner dashboard (`badge` in the activity API); the landing shows the badge image without its code. Below `FEW_ORDERS` (10, `lib/badge.ts`) verified orders the badge and the landing widget lead with the order count instead of the totals, so one big order can't look like inflation. With no example shop the widget shows dashes,
  never zeros. Section order: hero, the award line (partner logos and "founding partner" dropped 2026-11-15), customers ("I'm eco, and I have proof.", `#customers`, moved up under the hero on 2026-11-18; its picture is the passport phone mockup), "How it works" (`#how`, a carousel since 2026-11-18, `components/landing/HowItWorks.tsx`; it replaced "Live in three steps" and the Solana journey, which told the same steps: slide 1 "Find the QR code" shows three places to find it, each a picture with what a stamp there is worth, in this order: the café postcard photo (café / restaurant / hotel / resort), the eco shop door's receipt photo (a purchase in an eco shop), the parcel-arrived picture (an online order: parcel card and order email); points read from `lib/stampClasses.ts`; slide 2 "A few seconds on the phone" has the stamp picture, four steps worded for a visit and an order at once (no switch), "Watch it on a phone" (swaps the picture for the visit replay) and sharing; slide 3 "And it stays that way" is the plain-words "What is Solana, and why put a coffee stamp on it?" with the proof picture under it, the promises and honest limits, and carries `#why-chain`, which opens that slide; one scroll-snap row, as tall as the slide on show, with tabs and a next button that ends in "Join as a business". Pola wants slide 2 more interactive or animated later: talk first), "Anyone can print a green badge" (`#proof`: claim vs a record headlined "Unchanged since <date>", with the live check), business types, "Your public page writes itself" (`#impact`: badge, the shop impact widget, and a star card from `LandingStats.hospitality` with a Café / Restaurant | Hotel / Resort switch (`components/landing/HospitalityCard.tsx`; each a real place once one has published stars, else a demo place shown as a dashed specimen with unfilled stars; the hotel side adds "What guests see before they book"), after the real shop widget on phones), pricing, closing. Below `COUNTERS_FROM` proofs the hero shows an "early days" line instead of counter tiles; below 10 purchases the impact widget starts with the orders behind its numbers and highlights no figure. Phones get a "Try it: collect a demo stamp" button instead of the QR card. The phone replay (`components/landing/StampJourney.tsx`, `door` prop, loops, still under reduced motion) replays the real claim steps for a visit or an order; the scannable on-page QR card, the hash/memo tiles (`ChainFlow`) and the on/off-chain box were dropped as too much, too technical.
- `/join` lives outside `(app)` (`app/join/`, content in `components/landing/JoinFlow.tsx`) and wears the landing's journal chrome (`LandingNav page="join"`);
  sign-in there leads with Google/Facebook, the wallet sits under "Other ways to sign in".
- Points by kind (`POINTS_BY_KIND` in `lib/stampClasses.ts`, decided 21 Oct 2026): a presence stamp is worth 1 at a café or restaurant,
  2 at a hotel/resort, 1 at an eco store's till; a verified purchase is 5 (online order now; in store only after a successful receipt scan,
  so receipt scanning must land as a verified-class source). `pointsFor(source, kind)` everywhere; the passport query joins the place's kind.
  Recomputed on read, so old stamps follow today's table. The landing shows three doors: Café / Restaurant (one door, a small café/restaurant
  switch is planned), Hotel / Resort, Eco store.
- Rank personas (decided 22 Oct 2026): five different bees, one per rank, in `art/v2/ranks/personas/` (img2img from the former Sentinel card at
  denoise 0.72 to 0.78, `gen2.py`; ladder, prompts and seeds in its `seeds.json`; chosen renders `pick/<rank>.png`, hue-keyed card masters via `cards.py`).
  Sentinel is the young hooded bee (peace sign), Warden the former Sentinel (thumbs up), Guardian goggles (high five), Vanguard bandana (fist pump),
  Paragon spectacles and staff. Renders carry no badges or items (the compositor adds them), no visible abdomen, natural antennae, fuzzy ink arm bands,
  a fuzz head edge with no outline. Live cards: `art/v2/ranks/<rank>/<rank>_card.png` (old ones kept as `_prev`). After a card change run `node art/v2/compositor/nft-art.mjs`
  (static `public/nft/<rank>.png`: fixed background, rank aura, leaf badge, no item) then `npx tsx scripts/nft-webp.ts`, and `node art/v2/compositor/samples.mjs`
  (sample cards; `public/share/art/` is the 640px copy of their `_art.png`). The gold outline aura is built from each card's own alpha in `compose.mjs`. `art/v2/ranks`, `layers` and `compositor` are not in git (300 MB of renders); only `personas/pick` and the scripts are.
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
- Receipt scanning at home (3 pts) and the per-shop item memory that builds itself from confirmed scans.
- "Visitor-verified" (not "certified"): after a QR stamp, ask about one published practice
  (Yes / No / Didn't notice); a No becomes a report (`practice_reports`); badge after 3 visitors
  on 3 different days, shown with its count; any answer earns the reward, not only Yes.

## Naming and ownership (Pola, 2026-11-18)
- The brand is **EcoProof**, the address **ecoproof.app**; the wordmark is plain "EcoProof", one colour.
  **EcoProof AI** is only the name of the part that reads receipts and estimates or proposes products (receipt
  scanner, "EcoProof AI estimate", catalogue proposals from WooCommerce and later Shopify, `/about#ai`). Everywhere
  else write "EcoProof".
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
- After replacing an image under `public/`, `next dev` keeps serving the old optimized copies from `.next/dev/cache/images`
  (not `.next/cache/images`); delete that folder, or use a new file name.
- Impact numbers are estimates from `lib/impact.ts`, not audited data. Keep the
  README's "Honest limits" honest in anything public.

## Reference docs
- `README.md`: product, claim doors, layout, honest limits
- `SUBMISSION.md`: hackathon submission
- `docs/woocommerce/`: shop connection guide, local staging recipe
