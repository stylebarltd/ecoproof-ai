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
- Passport (`app/page.tsx`), public passport `/u/[id]`, joined-places map, self-serve
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
  `/places/<id>`, star pins + filters on `/map`. Kinds: cafe, restaurant, hotel, eco_shop
  (`lib/placeKinds.ts`); only cafe/restaurant/hotel have stars. An eco shop has channels: in store
  (has `stamp_place_locations`, computed as `in_store` by `PLACE_COLS`) and/or online
  (`sells_online`: WooCommerce, parcel cards). There is no "online shop" kind any more.
- Shops show impact instead of stars (`lib/shops.ts`: plastic and CO2 summed from the shop's
  proofs, `components/ShopImpact.tsx`) on the place page, map sheet and dashboard. `/shops` lists
  every eco shop (the only way to find online-only ones), nearest first. Online shops set a
  website and shipping origins (`ship_origins`, `lib/shipping.ts`): one per warehouse, each
  serving listed countries or "everyone else". The visitor's country (`x-vercel-ip-country`,
  or `?country=US` to test; unknown locally) picks the origin used for "ships from" and distance. Keep practice ids
  stable: answers are stored by id. Half stars: 5★ from 85 points, 4.5 from 78 (scale in the JSON);
  stars are always recomputed with today's scale, so changing it needs no republishing.
- Declarations: `place_practices` is the owner's private draft. "Publish…" (warning sheet, at
  most once a day, refused if unchanged) freezes it into `practice_declarations` (versions, never
  edited) and writes its SHA-256 to Solana (memo + claim account keyed on its id,
  `lib/declarations.ts`). Map, place page and dashboard read only the latest declaration, and only
  if it matches the place's current type. Pending proofs are written on view
  (`/api/declarations/<id>/anchor`); demo places get a seeded declaration.

### v2 plans, not built yet (agreed with Pola, in this order)
- "Where to get it": shops tick which practices their products help with (+ product link);
  a café's checklist shows the nearest supplier that ships to it (shop location or origin) under practices
  answered No and in "Next step up". Open to every shop, labelled, never affects stars.
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
- Port 5432 to Neon may be blocked from Pola's machine; use the Neon console SQL editor.
- **`SESSION_SECRET` is required in production** (>= 32 chars); locally a dev-only
  fallback is used. `ADMIN_TOKEN` (>= 16 chars) enables `/admin` and the admin API.
  Keep `.env.example` in sync when code reads a new variable.
- `next dev` rewrites `AGENTS.md`; that diff is expected.
- Impact numbers are estimates from `lib/impact.ts`, not audited data. Keep the
  README's "Honest limits" honest in anything public.

## Reference docs
- `README.md`: product, claim doors, layout, honest limits
- `SUBMISSION.md`: hackathon submission
- `docs/woocommerce/`: shop connection guide, local staging recipe
