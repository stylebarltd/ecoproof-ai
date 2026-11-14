# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Primary: business owners.** Owners of sustainable cafés, restaurants, hotels/resorts and eco shops (in store, online, or both), anywhere in the world. Their job is to show that real people really chose them, and to win new customers through that, without trusting their own database or buying a "certified" badge. They decide on the landing page, set up at `/join`, and run things from "My shop" (practices checklist, declarations, cards, badge, staff).
- **Secondary: their customers.** People who scan a QR at the counter, a card in a parcel, or a link in an order email, and collect stamps and Bee Guardian cards in an eco passport they can share. Most have no crypto knowledge and no wallet.

## Product Purpose
EcoProof AI turns real eco-friendly visits and purchases into shareable, verifiable social proof. A scan or verified order gives the customer a stamp; points unlock five rank milestones (Sentinel, Warden, Guardian, Vanguard, Paragon), each a soulbound Bee Guardian NFT. Every claim and every published practice declaration writes a SHA-256 fingerprint to Solana, so anyone can check it later. Success means owners join and keep their QR on the counter, and customers come back and share their passport.

## Positioning
Proof that can't be edited after the fact: one scan, one stamp, enforced on-chain, with a live "check this record" anyone can run. Hospitality places earn eco stars from a published, versioned practices declaration; shops show impact summed from their own verified orders. It is "visitor-verified", never "certified".

## Operating Context
- Three claim doors, one stamp each: place QR (`/c/<id>`), printed parcel card (`/k/<code>`), verified WooCommerce order (`/o/<place>/<token>`).
- Owners use it on a phone at the counter and on desktop for the dashboard; customers almost always on a phone, right after paying.
- Currently a hackathon build on Solana devnet (Best Use of Solana, Colosseum Chiang Mai 2026); demo places without a GPS check exist for judges on purpose.
- Launch market: global, English only.

## Capabilities and Constraints
- Next.js 16 App Router, Tailwind, Postgres, Solana (devnet), Metaplex Bubblegum V2. Accounts via wallet, Google or Facebook (v2).
- Points: presence 1 (2 at a hotel/resort), verified purchase 5. Values live in `lib/stampClasses.ts`; practices, points and the star scale only in `data/practices.json`, never hard-coded.
- Only café, restaurant and hotel have stars; eco shops show impact instead.
- Planned, not built: receipt scanning for eco shops; visitor-verified practice checks.

## Brand Commitments
- **Honest limits.** Impact numbers are estimates from `lib/impact.ts`, labelled as such; never "certified" or "audited". Public statistics only with a citable source. Empty data shows dashes, never zeros.
- **No wallet needed.** Customers never need crypto knowledge; Solana stays in the background as the reason the record is trustworthy, explained from the customer's view, not the mechanics.
- **One art language:** the cel-shaded Bee Guardian card set, five rank personas (`art/v2/ranks/`, `public/nft/`). No mixing in other illustration styles.
- **Pricing as drafted** (`lib/landingContent.ts`): Founding free for the first 50 businesses; Early from $50/year, locked for life in the first year; Standard $200/year. Final numbers may still change in that file.
- Name: "EcoProof AI" / "EcoProof". Made by SuperBee (stylebar).

## Evidence on Hand
- Live counters and the newest verified record from the database (`lib/landingStats.ts`), the example shop's proofs (`/places/<id>#proofs`), live badge (`/api/badge/<place>.svg`), on-chain verify (`/api/verify/<id>`).
- Hackathon win (Colosseum Chiang Mai 2026, Best Use of Solana).
- Partner logos in `public/landing/partners/`; SuperBee is the first real shop.
- No testimonials, customer quotes, case studies or audited impact data exist yet; do not invent them.

## Product Principles
1. Owners first: every surface should help an owner decide, set up, or prove something.
2. Show the real record, not a claim about it: link to the live proof wherever a number appears.
3. Honest over impressive: estimates are called estimates, limits are stated.
4. Crypto invisible to customers: the wallet is optional, the benefit is "it stays that way".
5. One passport, simple rules: one scan, one stamp; points and ranks anyone can understand.
