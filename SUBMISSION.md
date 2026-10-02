# EcoProof AI: submission text and demo script

Live app: https://ecoproof-ai.vercel.app
Code: https://github.com/stylebarltd/ecoproof-ai
Chain: Solana devnet (memo proofs)

One-liner: **EcoProof AI turns a sustainable purchase receipt into a verified, shareable environmental impact passport, with the proof anchored on Solana.**

---

## Submission form answers

### What are you building, and who is it for?
EcoProof AI is a mobile-first PWA that gives consumers a verified environmental impact passport for their sustainable purchases.

A user snaps or uploads a receipt. Claude reads the photo, extracts every line item and classifies it (reusable bag, beeswax wrap, refill product, solid personal care, and so on). A transparent emission-factor table then estimates CO₂ saved, single-use plastics avoided and packaging reduced. The result is stored in the user's EcoProof Passport with a streak counter and achievement badges, and a 1200×630 share card is generated for social media. A fingerprint (SHA-256) of every impact record is written to Solana, so anyone can check that a claim was not edited after the fact.

It is for environmentally conscious consumers who want their choices to be visible and rewarding, and for sustainable brands and ecommerce merchants who want to show real, checkable impact instead of unverifiable marketing claims.

### Why did you decide to build this, and why now?
Millions of people make sustainable choices every day, but the cumulative impact is invisible. That makes it hard for people to stay motivated and hard for brands to prove their claims. Sustainability tracking has always meant manual logging, which nobody keeps up.

Two things changed. Vision-capable language models can now read a crumpled receipt photo and return clean structured data in seconds, which removes the manual work. And people already share fitness streaks and travel milestones online, so there is an appetite for making environmental impact just as visible and shareable.

We also run a sustainability-focused ecommerce business (SuperBee), so we built this for a real customer base and a problem we have personally experienced. The demo receipt in the app is from our own shop's product range.

### What technologies are you using or integrating with?
- **Anthropic Claude API** (`claude-opus-5-5`, vision + structured JSON output) for receipt reading and product classification
- **Solana** (devnet, `@solana/web3.js`, Memo program) for on-chain proof records
- **Next.js 16 / React / Tailwind** for the mobile-first PWA (installable, camera capture)
- **Node.js route handlers** for the API
- **PostgreSQL (Neon)** for users' impact records
- **`next/og`** for share-card image generation, **`qrcode`** for proof QR codes
- **Vercel** for hosting

### Which chains does your product use?
Solana

### How does your product use these chains?
Every verified impact record is hashed (SHA-256 over the record: receipt id, merchant, classified items, calculated impact, timestamp). The hash is submitted to Solana as an `ecoproof:v1:<hash>` memo transaction, which gives each record an immutable, timestamped, publicly viewable on-chain proof.

Each passport page has a **Verify on-chain** button. It recomputes the hash from the stored data, fetches the transaction from Solana, and checks that the on-chain memo matches. If the record had been edited after the fact, the check fails. Each passport also shows a QR code linking straight to the Solana Explorer transaction. Brands and consumers can therefore back a sustainability claim with transparent proof instead of relying on a centralized database.

**Each receipt can only be claimed once, and Solana enforces that.** Every receipt gets a fingerprint (receipt number + date + total). That fingerprint deterministically maps to a claim account address on Solana. Claiming a receipt means creating that account, in the same transaction that records the impact hash. Solana's runtime refuses to create an account that already exists, so a second claim of the same receipt fails on-chain (custom program error 0x0), even if two servers race, and without any custom program. Anyone holding a receipt can recompute the address and check it on Explorer, so the rule is independently verifiable instead of living in our database. Passport receipts and place reviews use separate claim namespaces, so one purchase can count once for impact and once for a review.

Currently the proofs are on Solana devnet. Mainnet is a configuration change.

### Category
Climate / Green Tech (alternatives: Consumer, AI)

### Is your project a mobile-focused dApp?
Yes. It is a mobile-first PWA: the primary flow is taking a photo of a receipt on a phone, viewing your passport, and sharing the impact card. It installs to the home screen and uses the phone camera directly.

### Did anyone not listed on the team do meaningful work on this project?
No. All meaningful work was completed by the listed team members during the hackathon period.

### Anything else judges should know?
- EcoProof AI focuses on real-world consumer behavior rather than speculation. Nothing in it is tokenized or financialized.
- It is built by the team behind a live sustainable ecommerce business, so the use case is real.
- **What is built vs. planned.** Built and working today: receipt photo → AI extraction → impact calculation → Solana proof → passport with streaks, badges and share card → on-chain verification. Planned and not built yet: Shopify and WooCommerce import, product barcode scanning, brand APIs, NFT passport badges and corporate ESG dashboards.
- **Plastic-free map (Chiang Mai).** Real cafes and restaurants from OpenStreetMap, with eco claims coming only from shop pledges that customers confirm. Reviews need a receipt from that place (checked by Claude), each receipt can be used once (enforced by an on-chain claim account), and every review is anchored on Solana so history can't be edited. Bring-your-own-cup visits count toward the user's streak. We describe these as verified-purchase reviews with tamper-proof history, not as unfakeable.
- **Wallet sign-in.** Users can sign in with Phantom, Solflare or Backpack using Sign-In With Solana: the wallet signs a short message (no transaction, no fee), the server checks the ed25519 signature, a one-time nonce and the domain, and starts an httpOnly session. The passport then belongs to the wallet and follows the user across devices; the passport already on a device is linked to the wallet without rewriting any proofs. Guests can still use the app without a wallet.
- **Impact figures are estimates.** They come from a transparent, hand-built emission-factor table (`lib/impact.ts`), not audited lifecycle assessments. The blockchain proves a record was not altered after creation; it does not by itself prove the underlying purchase happened. Linking to merchant-issued receipts through ecommerce integrations is the roadmap path to closing that gap.

---

## Demo script (about 90 seconds, phone screen recording)

Before recording: use a fresh browser profile (or clear site data) so the passport starts empty, install the PWA to the home screen, and keep the Solana Explorer open in a second tab.

| Time | On screen | Say |
|---|---|---|
| 0:00 | Home screen, tap the EcoProof icon | "Every day people choose reusable, plastic-free products, but that impact is invisible. EcoProof AI makes it visible, and provable." |
| 0:10 | Empty passport: 0 kg, 0-day streak, locked badges | "This is my EcoProof Passport. It's empty, so let's add my latest purchase." |
| 0:15 | Tap **Scan a receipt**, photograph the SuperBee receipt (or tap the demo receipt button) | "I just scan the receipt. No manual logging." |
| 0:22 | Spinner: "Reading receipt & anchoring proof…" | "Claude reads the receipt, identifies each product, and classifies what's sustainable." |
| 0:30 | Result: four items with green ticks, **+2.8 kg CO₂, +153 plastics, +140 g packaging** | "Beeswax wraps, a refill laundry pouch, toothpaste tabs and reusable bags: about 150 single-use plastics avoided and 2.8 kilos of CO₂ saved." |
| 0:42 | Tap **Verified on Solana** link, Explorer opens on the memo transaction | "And here's the key part: the fingerprint of this record is now on Solana. Public, timestamped, can't be quietly edited." |
| 0:55 | Back, tap **Open share card**, then **Verify on-chain**; three green ticks | "Anyone can verify it. We recompute the fingerprint from the data and compare it with the blockchain. Three green checks." |
| 1:08 | Show the share card, then home with streak 🔥 1 and **First Proof** badge unlocked | "I get a shareable card for social media, a streak to keep me coming back, and badges to unlock." |
| 1:20 | Back on the home screen, badges row | "For brands, the same proof turns sustainability claims into something customers can check themselves." |
| 1:28 | Logo and URL | "EcoProof AI: make your impact visible, and verifiable." |

### Tips
- Do one clean take of the receipt scan beforehand to be sure the network and the devnet wallet are healthy. The wallet needs SOL (`7mczVi8f1MX8Z61q2ezdMcku3N2XpG1fHHbDz136rWnt` on devnet); each proof costs a tiny amount.
- If the camera is awkward on stage, use the **Try the demo receipt** button. It runs the same pipeline on the same receipt.
- If Solana is slow, the app still saves the record and shows "Anchoring pending". Say so honestly rather than waiting.

### Likely judge questions
- **"Does the chain prove the receipt is real?"** No. It proves the record was not altered after creation. Proving the purchase itself needs merchant-issued receipts, which is what the Shopify/WooCommerce integrations are for.
- **"How accurate are the numbers?"** They are estimates from a transparent factor table, shown as such. The model only classifies the products; the maths is deterministic and auditable.
- **"Why blockchain? Couldn't a database do this?"** A database only works if you trust whoever runs it. Here the "this receipt is already used" rule and each record's fingerprint live on a public ledger that we cannot edit, delete or quietly reset. Brands, users and judges can verify a claim without trusting us, and the rule survives even if EcoProof disappears. That is what makes a streak, a badge or a "verified" review mean something.
- **"Can the same receipt be claimed twice?"** No: the second attempt is rejected, and the app links to the existing on-chain claim. We tested this on the live site for both passport scans and reviews. Limits: the fingerprint comes from what the AI reads (number, date, total), so a differently photographed receipt that is misread could get a different fingerprint, and a receipt with no readable number, date or total is rejected. POS-issued digital receipts would remove that ambiguity.
- **"Why Solana?"** Proofs cost a fraction of a cent and confirm in seconds, which is what makes anchoring every receipt practical.
- **"Business model?"** Free for consumers. Brands pay for verified-impact widgets and APIs for their storefronts, plus ESG reporting for businesses.

## Roadmap
1. Shopify and WooCommerce import, so verified merchant receipts replace photo uploads
2. Product barcode scanning
3. Brand API and embeddable "verified impact" badge for storefronts
4. Passport NFT badges
5. Corporate ESG dashboards
