@AGENTS.md

# EcoProof AI (ecoproof.superbee.me)

## What this is
Eco passport app: customers scan a shop's QR, a parcel card or a verified-order
link, collect stamps and soulbound Bee Guardian NFTs; every claim writes a proof
on Solana. For sustainable shops, cafés, markets and online brands.
- App: https://ecoproof.superbee.me · showcase site: `../ecoproofai.stylebar.de`
  (https://ecoproofai.stylebar.de) · repo `stylebarltd/ecoproof-ai`.
- Won Best Use of Solana at Colosseum Chiang Mai 2026.
- Still in its hackathon-judging phase on **Solana devnet** (see Gotchas).

## Branches: what is live vs v2
- **`main` = production** (live app). Deploys by pushing `main` (Vercel).
- **`v2` = all v2 work**, one branch, no feature branches or PRs. Pushing `v2` only
  updates the preview https://ecoproof-ai-git-v2-stylebar.vercel.app (own preview DB).
  **Never merge into `main` or deploy production until Pola says v2 is ready.**

### Live on `main` today
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
- Postgres: tables created at startup (`lib/db.ts`). No accounts.

### Built on `v2`, not live yet
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
- "Where to get it": shops tick practices their products help with (`shop_supplies`, one row per
  practice id; same-wording practices are one topic, `supplyTopics()`), with product and link.
  A café/restaurant/hotel checklist shows the 2 nearest shops under practices not answered Yes
  and in "Next step up" (`lib/supplies.ts`): distance to the shop's locations, or to the warehouse
  serving the owner's country (request country, not stored per place). Never affects stars.
- Three homes at `/` (`app/page.tsx`, decided on the server from the session): signed out → the marketing landing page
  (`components/landing/`, design brief of 21 Oct 2026: kraft/paper tokens and Fraunces/Nunito/Bebas in `globals.css`, live counter from
  `lib/landingStats.ts`, pricing copy in `lib/landingContent.ts`, `LANDING_DEMO_PASSPORT` for "See a live passport"); a customer → their
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
  `v3_*.py`) never matched; the island stays as generated. The earlier SD flat-lay hero (`art/hero-r1/`, `art/v2/hero/`) was dropped for mixing two styles; the four owner-door spots
  (`public/landing/doors/`, picked from `art/doors/`: coffee/restaurant seed 2070966653, hotel 826490947, store 1172946982; epicrealismXL via the local A1111 API) and partner logos (`public/landing/partners/`, from
  `art/partner/`) stay. How-it-works step images `public/landing/steps/`: connect is a photoreal composite
  (`art/steps/connect/`: epicrealismXL counter scene seed 105 with a blank card stand, `compose2.py 105` warps the real demo-café QR card
  onto it; `compose2.py 103` is the alternative with a replica of the WordPress plugins page on a tablet POS plus the card), stamp is a screenshot from
  `../ecoproofai.stylebar.de/src/assets/screens/` (stamp collection), share is `/api/passport-card/<id>?format=square` rendered
  locally with `APP_URL=https://ecoproof.superbee.me` for the footer (local Warden passport `DGc2…`). Share images (`lib/beeCardOg.tsx`,
  `/api/passport-card`, `/api/card`) draw the NFT card set's frame (paper, rank-coloured rim, Caprasimo/Figtree) on kraft paper with the
  cel-shaded rank art from `public/share/art/` (640px, from `art/v2/compositor/samples/`) and the fonts from `public/share/fonts/`
  (static Figtree instances: the og renderer cannot read variable fonts), both traced in `next.config.ts`. The counter strip counts plastic *items* avoided, not kg (that is what
  the DB has).
- Points by kind (`POINTS_BY_KIND` in `lib/stampClasses.ts`, decided 21 Oct 2026): a presence stamp is worth 1 at a café or restaurant,
  2 at a hotel/resort, 1 at an eco store's till; a verified purchase is 5 (online order now; in store only after a successful receipt scan,
  so receipt scanning must land as a verified-class source). `pointsFor(source, kind)` everywhere; the passport query joins the place's kind.
  Recomputed on read, so old stamps follow today's table. The landing shows three doors: Café / Restaurant (one door, a small café/restaurant
  switch is planned), Hotel / Resort, Eco store.
- Rank personas (decided 22 Oct 2026): five different bees, one per rank, in `art/v2/ranks/personas/` (img2img from the former Sentinel card at
  denoise 0.72 to 0.78, `gen2.py`; ladder, prompts and seeds in its `seeds.json`; chosen renders `pick/<rank>.png`, hue-keyed card masters via `cards.py`).
  Sentinel is the young hooded bee (peace sign), Warden the former Sentinel (thumbs up), Guardian goggles (high five), Vanguard bandana (fist pump),
  Paragon spectacles and staff. Renders carry no badges or items (the compositor adds them), no visible abdomen, natural antennae, fuzzy ink arm bands,
  a fuzz head edge with no outline. Live cards: `art/v2/ranks/<rank>/<rank>_card.png` (old ones kept as `_prev`); `node art/v2/compositor/samples.mjs`
  re-renders the sample cards. `art/v2/ranks`, `layers` and `compositor` are not in git (300 MB of renders); only `personas/pick` and the scripts are.
- Declarations: `place_practices` is the owner's private draft. "Publish…" (warning sheet, at
  most once a day, refused if unchanged) freezes it into `practice_declarations` (versions, never
  edited) and writes its SHA-256 to Solana (memo + claim account keyed on its id,
  `lib/declarations.ts`). Map, place page and dashboard read only the latest declaration, and only
  if it matches the place's current type. Pending proofs are written on view
  (`/api/declarations/<id>/anchor`); demo places get a seeded declaration.

### v2 plans, not built yet (agreed with Pola, in this order)
- Receipt scanning for eco shops: in the shop (GPS, name matches) 5 pts, at home 3 pts, receipt
  at most 7 days old, once per receipt on-chain; Claude sorts items into `lib/impact.ts`
  categories, and a per-shop item memory builds itself (shops never enter products).
- "Visitor-verified" (not "certified"): after a QR stamp, ask about one published practice
  (Yes / No / Didn't notice); a No becomes a report (`practice_reports`); badge after 3 visitors
  on 3 different days, shown with its count; any answer earns the reward, not only Yes.

## Stack
Next.js 16 (App Router; read `node_modules/next/dist/docs/` first, see AGENTS.md) ·
React · Tailwind · `@solana/web3.js` (devnet) · Metaplex · PostgreSQL (Neon) via `pg`
(+ Drizzle on v2) · Anthropic SDK (`CATEGORY_MODEL`, `PRODUCT_IMPACT_MODEL`) · Leaflet.
Hosting: Vercel team "stylebar" (Hobby), project `ecoproof-ai`.

## Commands
```bash
npm install
cp .env.example .env.local     # fill in the values
npm run dev                    # http://localhost:3000
npm run build
npm run lint
npm test                       # star engine tests (node --test, no extra deps)
npm run db:generate            # v2: new migration from lib/schema.ts
npm run db:migrate             # v2: apply migrations (reads .env.local)
npx tsx scripts/nft-setup.ts   # one-time: Merkle tree + NFT collection
npx tsx scripts/demo-qr.ts     # regenerate the demo QR codes
npx tsx scripts/nft-webp.ts    # 512px copies of the rank artwork in public/nft/
```
Local DB: Docker Postgres container `ecoproof-pg` (port 5433), database `ecoproof`.

## Gotchas
- **Hackathon phase:** the no-GPS demo places are intentional for the judges. Don't
  remove or restrict them; production hardening (GPS everywhere, no demo points,
  durable rate limits, Sybil wallets, mainnet) is a pre-launch checklist, not bugs.
- **Vercel blocks deploys whose commit author isn't on the team.** Commit as
  `echo@stylebar.de`, not the global `boom@stylebar.de`. Check `git log -1 --format=%ae`.
- **`DATABASE_URL_UNPOOLED` in `.env.local` points at production.** Never use it locally.
  Previews read `PREVIEW_DATABASE_DATABASE_URL` and refuse to fall back to production.
- Previews build their links (QR, cards, order links, webhooks) from `VERCEL_BRANCH_URL`, not
  `APP_URL` (`appUrl()` in `lib/nft.ts`).
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
