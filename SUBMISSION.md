# EcoProof AI: submission text and demo script

> **Before you submit (delete this box):** this text describes the stamp-model build on branch `pivot/order-proofs-nft`. Until that build is promoted to production, `https://ecoproof-ai.vercel.app` still serves the earlier receipt-scanning version, so either point the live link at the preview (`https://ecoproof-ai-git-pivot-order-proofs-nft-stylebar.vercel.app`) or promote the branch first. Also confirm the SuperBee impact wording and logo, and that the demo wallet has devnet SOL.

Live app: https://ecoproof-ai.vercel.app
Code: https://github.com/stylebarltd/ecoproof-ai
Chain: Solana devnet (proofs and soulbound compressed NFTs)

One-liner: **EcoProof turns a scan into a stamp in an eco passport, every stamp is proven on Solana, and enough stamps unlock a soulbound Eco Warrior NFT. It brings sustainable brands new customers through the social proof their customers share.**

---

## Submission form answers

### What are you building, and who is it for?
EcoProof is a mobile-first web app that lets sustainable brands turn real eco-friendly visits and purchases into shareable, verified social proof.

A customer taps a link or scans a QR code and collects a **stamp** in their EcoProof passport: scan, collect, unlock. Collect enough stamps and a **soulbound Eco Warrior NFT** is minted to their wallet at 1, 3, 10 and 25 stamps, then every 50. The artwork levels up from Seedling to Sprout, Guardian and Legend. The passport is built to be shared: a polished image with the customer's NFT, stamps and progress, linking back to their live passport, which is how a brand gains new customers.

Everything is a **place**: an online brand like SuperBee, a café, a market stall. A place has a name, a stamp (its logo), a one-line tagline and its own QR. We set up launch partners ourselves, and owners can self-serve: sign in with a wallet, upload a logo, and the app generates their QR and a print-ready counter card.

There are three ways to claim a stamp, all producing one stamp and one Solana proof:
1. **Place QR**: a counter display (once per day per person; physical places set up by their owner always get a GPS check).
2. **Printed card**: single-use QR cards dropped into a parcel. It works on any channel, including Amazon, Lazada and Shopee, and needs no code from the shop.
3. **Verified order** (WooCommerce): the shop's built-in webhook sends the completed order, and the order-completed email carries a QR signed per order. This is the only door that proves a real order happened, so only this stamp carries a real impact line ("110 single-use plastics avoided").

It's for sustainable brands and local businesses that want customers to show them off, and for customers who want their habits to be visible and rewarding.

### Why did you decide to build this, and why now?
Customers have nothing to show for sustainable habits, and sustainable brands have no cheap way to prove that real people really chose them. Marketing claims are unverifiable and loyalty programmes are expensive, closed and forgettable.

Two things make this the right time. Compressed NFTs on Solana mean a collectible costs a fraction of a cent, so a reward can be the NFT itself instead of a freebie that costs the brand money. And people already share streaks and collectibles online, so a passport that looks good to share does the brand's marketing for it.

We run a sustainable ecommerce business (SuperBee, a certified B Corp), so the online-order path was built for a real shop and a real email, and we tested it end to end on a staging copy of a WooCommerce store.

### What technologies are you using or integrating with?
- **Solana** (devnet, `@solana/web3.js`): Memo-program proofs plus claim accounts that enforce "once only" on-chain
- **Metaplex Bubblegum V2 and MPL-Core**: compressed NFTs, made non-transferable (soulbound) with `setNonTransferableV2`
- **Sign-In With Solana** (Phantom, Solflare, Backpack): wallet sessions with a one-time nonce
- **WooCommerce** built-in webhooks (HMAC-signed) and a child-theme snippet for the order email
- **Next.js 16 / React / Tailwind** (mobile-first PWA), **`next/og`** for share images, **`qrcode`**
- **PostgreSQL (Neon)**, **Vercel**
- **Anthropic Claude API**: classifies products the catalogue doesn't know into impact categories (estimates)

### Which chains does your product use?
Solana

### How does your product use these chains?
**Every valid claim writes a proof.** The claim record (place, person, door, time, and the order's items and impact when there is one) is hashed with SHA-256 and written to Solana as an `ecoproof:v1:<hash>` memo. Each proof has a *Verify on-chain* button that recomputes the hash from the stored data and compares it with the memo.

**"One scan, one stamp" is enforced by Solana, not by our database.** Each claim has a fingerprint: place + person + day for the counter QR, the code for a printed card, and the order id for a verified order. The fingerprint deterministically maps to a claim account address, and claiming means creating that account in the same transaction that records the proof. Solana's runtime refuses to create an account that already exists, so a repeat claim fails on-chain, even if two servers race, and without any custom program. Anyone can recompute the address and check it on Explorer.

**Milestones mint soulbound compressed NFTs.** At 1, 3, 10, 25 and then every 50 stamps, EcoProof mints a compressed NFT with Bubblegum V2 into a Merkle tree and MPL-Core collection we created, then marks it non-transferable, so the collectible can't be bought, only earned. The NFT artwork and its metadata are served by the app. Passports show each NFT with a link to Solana Explorer.

Everything runs on Solana devnet today; mainnet is a configuration change.

### Category
Consumer / Climate (alternatives: Green Tech, NFTs & Collectibles)

### Is your project a mobile-focused dApp?
Yes. It is a mobile-first PWA built around phone use: scanning a QR, tapping a link in an email, connecting a mobile wallet, and sharing an image from the phone's share sheet.

### Did anyone not listed on the team do meaningful work on this project?
No. All meaningful work was completed by the listed team members during the hackathon period.

### Anything else judges should know?
- **What is built and working today:** places with QR, stamp art and print-ready counter cards; self-serve place setup at `/join`; the three claim doors; Solana proofs with on-chain verification and on-chain once-only claims; soulbound milestone NFTs with four tiers of artwork; a glass-style passport with hero NFTs, stamp collection, progress and proof trail; a shareable passport image; a map of joined places only; live progress while a stamp is written to Solana.
- **WooCommerce was tested end to end on a local staging shop**: completed order → signed webhook → order-completed email with the QR → claim → stamp with the real impact line. Refunded or cancelled orders are voided, and a second claim of the same order is refused. We have **not** installed anything on the live SuperBee shop yet.
- **Honest limits.** Only the verified-order door proves a purchase; QR and card stamps are generic stamps with no impact number. GPS checks stop casual abuse but can be spoofed. Impact figures are estimates from a hand-built factor table (`lib/impact.ts`), not audited lifecycle data; for shops other than SuperBee, unknown products are classified by an AI and the result is an estimate. Self-serve places are limited to three per owner and are not independently vetted: the map's "verified" means *claimed and set up on EcoProof*, and real vetting is roadmap. NFTs are on devnet and may not show in every wallet.
- **Removed on purpose.** An earlier version of this project scanned receipt photos with AI. We replaced it because the proof should come from the shop, not from a customer photo.
- **Roadmap:** capture line items from marketplace order emails (Amazon, Shopee, Lazada) with DKIM verification of the email; Shopify and other platforms; owner dashboards and place editing; independent vetting of places; mainnet.

---

## Demo script (about 2 minutes, phone screen recording)

**Before recording**
- Use a fresh browser profile and a wallet with no stamps. Connect it on the app, so NFTs mint to it.
- Collect the first two stamps beforehand (SuperBee and Demo Café) so the third stamp triggers a milestone live. Keep Solana Explorer open in a second tab.
- Have the order-completed email from the staging shop ready (or open the signed link directly), and a printed counter card or a QR on a second screen.
- The wallet that pays for proofs needs devnet SOL (`7mczVi8f1MX8Z61q2ezdMcku3N2XpG1fHHbDz136rWnt`); each proof costs a tiny amount.

| Time | On screen | Say |
|---|---|---|
| 0:00 | Open the app: the logo splash fades into the passport | "Sustainable brands can't easily show that real people chose them. EcoProof turns every scan into a stamp, and every stamp is proven on Solana." |
| 0:10 | Passport hero: Seedling NFT, stamp collection (2 stamps), progress "2 stamps, 1 to Sprout" | "This is my eco passport. Two stamps, and one more unlocks my next Eco Warrior." |
| 0:20 | Scan the Demo Restaurant QR (or open the link) → the claim page → **Collect stamp** | "A restaurant puts this QR on the counter. I scan it." |
| 0:28 | The checklist runs: checking, writing the proof to Solana, saving, updating progress, minting your NFT | "Right now it's writing a proof to Solana, saving it to my passport, and since this is my third stamp, minting a collectible." |
| 0:50 | Done: "Stamp collected", Sprout NFT; tap *See the proof on Solana* → Explorer | "Every stamp has a public, timestamped proof. And that scan can never be reused, because Solana won't create the same claim account twice." |
| 1:05 | Passport: Sprout is now the hero (larger), Seedling beside it; tap the NFT → Explorer | "My new Sprout is soulbound: I can't sell it, I can only earn it. Higher tiers look different, so it visibly levels up." |
| 1:15 | Tap **Share my passport** → the image with the NFT, stamps and numbers | "This image is what I post. It links back to my live passport, so every share brings the brand new customers." |
| 1:25 | The SuperBee order-completed email → tap **Collect my stamp** → claim page "Your order: 110 single-use plastics avoided" | "For online shops it works from the order email. This one is a real WooCommerce order, so the stamp carries the order's real impact. Only this door proves the order happened." |
| 1:40 | Collect → the stamp appears in the proof trail tagged *verified order* | "Cards in a parcel work too, on Amazon or Shopee, with no shop code, but those are generic stamps." |
| 1:50 | `/join` form (or Map) | "Any owner can set up a place in a minute: logo, tagline, and the app generates their QR. The map only shows places that joined." |
| 2:00 | Logo | "EcoProof: scan, collect, unlock." |

### Tips
- The Solana step takes roughly 10 to 15 seconds and the NFT mint a few more. That's why the app shows the checklist: say what is happening while it runs rather than waiting in silence.
- If Solana is slow, the stamp is still saved and shows as pending; the passport page offers a retry. Say so honestly.
- The Demo Café, Demo Restaurant and Demo Coffee Roasters have the GPS check turned off, so they work from anywhere. Places owners create themselves always have it on.

### Likely judge questions
- **"Does the chain prove the purchase is real?"** Only for verified orders, where the shop's own webhook supplies the order and our signed link carries it. QR and card stamps are generic and say so. The chain proves a record wasn't altered and that a code was used once.
- **"Why blockchain? Couldn't a database do this?"** "This code or order was already used" and each stamp's fingerprint live on a public ledger we can't edit or reset. A brand, a customer or a judge can verify a claim without trusting us, and the rule survives even if EcoProof disappears.
- **"Why a soulbound NFT?"** The reward is the NFT itself, so it costs the brand nothing, and soulbound means it can only be earned, not bought. Compressed NFTs make it a fraction of a cent each.
- **"How do you stop people faking stamps?"** Single-use codes and orders (enforced on-chain), once per day per person at a counter, GPS checks for owner-created places, and a signed link per order. Limits: GPS can be spoofed and we don't vet places yet. We say so rather than claim "unfakeable".
- **"How accurate are the impact numbers?"** They're estimates from a transparent factor table, shown as such. Only the verified-order door shows one, and the maths is deterministic and auditable. SuperBee's products are mapped by hand; unknown products go through an AI and are estimates.
- **"Business model?"** Free for customers. Brands pay for verified-order integrations, branded stamps and passport placement. The reward is an NFT, not a discount, so promotions don't eat their margin.
- **"Why Solana?"** Proofs and mints cost a fraction of a cent and confirm in seconds, which makes it practical to anchor every stamp.

## Roadmap
1. Roll out the WooCommerce door on the live SuperBee shop, then Shopify
2. Marketplace order emails (Amazon, Shopee, Lazada) with DKIM verification
3. Owner dashboard: edit places, see stamp counts, manage cards
4. Independent vetting of places, abuse tools
5. Mainnet
