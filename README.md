# 🌱 EcoProof AI

**A verified environmental impact passport for sustainable purchases.** Snap a receipt, let AI work out the impact, and anchor the proof on Solana.

**Live demo:** https://ecoproof-ai.vercel.app (tap *Try the demo receipt*)

## How it works

1. **Scan** a receipt photo on your phone (mobile-first PWA).
2. **Claude** (vision + structured output) extracts each line item and classifies it, e.g. reusable bag, beeswax wrap, refill product, solid personal care.
3. A transparent **emission-factor table** (`lib/impact.ts`) estimates CO₂ saved, single-use plastics avoided and packaging reduced.
4. The record is hashed (SHA-256) and the hash is written to **Solana** as a Memo transaction (`ecoproof:v1:<hash>`).
5. The user's **passport** shows totals, a daily streak, achievement badges and a shareable social card with a proof QR code.
6. **Verify on-chain** recomputes the hash from the stored data and checks it against the memo on Solana.

## Stack

Next.js 16 (App Router) · React · Tailwind · Anthropic Claude API · Solana (`@solana/web3.js`, devnet) · PostgreSQL (Neon) · `next/og` · Vercel

## What is built, and what is not

| Built | Planned |
|---|---|
| Receipt photo → AI extraction → impact estimate | Shopify / WooCommerce import |
| Solana proof + on-chain verification | Product barcode scanning |
| Passport: streaks, badges, history | Brand APIs / embeddable badge |
| Share card + proof QR | Passport NFT badges, ESG dashboards |
| Plastic-free map of Chiang Mai (150 places from OpenStreetMap), shop pledges, receipt-verified reviews anchored on Solana, bring-your-own-cup streaks | More cities, merchant POS receipts, shop accounts |

**Caveats.** Impact numbers are estimates from a hand-built factor table, not audited lifecycle data. The blockchain proves a record was not altered after creation; it does not prove the purchase happened. Merchant-issued receipts via ecommerce integrations are the planned path to that.

## Plastic-free map (Chiang Mai)

- Places come from OpenStreetMap with **no eco claims attached**. Claims exist only when a shop **pledges** a practice (no styrofoam, no plastic straws, no plastic cups, BYO-cup discount).
- A pledge earns a **verified badge** once 3 different customers confirm it in reviews. (Demo shops need 1.)
- **Reviews require a receipt from that place.** Claude checks the receipt belongs to the place and reads its date and number. Receipts older than 14 days are rejected, and one receipt can only ever be used for one review. Each review is hashed and anchored on Solana.
- Ticking "I brought my own cup" adds the visit to your impact totals and **counts toward your streak**.
- **Limits.** This makes fake reviews hard and reuse impossible, not impossible: someone could still photograph a receipt they did not pay for. Merchant-issued or POS-signed receipts are the planned fix. Discounts are shown, not enforced.

## Project layout

```
app/page.tsx                 passport home, scan, badges, history
app/p/[id]/page.tsx          passport + share card + verify button
app/api/receipts/route.ts    upload → Claude → impact → Solana → DB
app/api/verify/[id]/route.ts recompute hash, compare to on-chain memo
app/api/passport/route.ts    totals, streaks, badges
app/api/card/[id]/route.tsx  1200×630 share image
lib/extract.ts               Claude vision extraction (structured output)
lib/impact.ts                emission factors + impact maths
lib/solana.ts, lib/verify.ts anchoring and verification
lib/passport.ts              streak and badge logic
```

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Receipt reading. Without it a mock extractor is used. |
| `DATABASE_URL` | Postgres connection string (Neon, or local Docker). |
| `SOLANA_SECRET_KEY` | Base58 secret key of a **devnet** wallet that pays for memo transactions. Locally, a key is generated in `.payer.json` if unset. The wallet needs devnet SOL (faucet.solana.com). |
| `SOLANA_RPC_URL` | Optional, defaults to public devnet. |

Local Postgres: `docker run -d -e POSTGRES_PASSWORD=pg -e POSTGRES_DB=ecoproof -p 5433:5432 postgres:16-alpine`, then `DATABASE_URL=postgres://postgres:pg@localhost:5433/ecoproof`. The table is created automatically.

## More

Submission text and the demo script are in [SUBMISSION.md](./SUBMISSION.md).
