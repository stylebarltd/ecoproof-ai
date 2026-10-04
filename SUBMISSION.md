# EcoProof AI: submission text and demo script

Live app: https://ecoproof.superbee.me
Code: https://github.com/stylebarltd/ecoproof-ai
Chain: Solana devnet (proofs and soulbound compressed NFTs)

Tagline: **"I'm eco — and I have proof."** EcoProof turns a scan into a stamp in an eco passport, every stamp is proven on Solana, and enough stamps unlock a soulbound Eco Warrior NFT. Brands get new customers through the proof their customers share.

---

## Submission form answers

Chain: **Solana**. Category: **Consumer / Climate**. Mobile-focused: **yes**, a mobile-first PWA built around scanning, tapping links, mobile wallets and sharing.

### Brief description (≤500 chars)
"I'm eco — and I have proof." EcoProof turns your real sustainable purchases into a shareable eco passport. Scan a QR or tap a link after an eco purchase and collect a stamp from that brand or café, each one anchored on Solana so it can't be edited or reused. Hit milestones and mint a soulbound eco-warrior NFT. Show the world you actually walk the talk. And because customers love showing it off, brands get real, verified social proof that brings new ones in.

*(462 chars)*

### What are you building and who is it for? (≤1000 chars)
Lots of people think of themselves as eco-conscious but have nothing to show for it. EcoProof gives them proof.

After a sustainable purchase you scan a QR or tap a link, and a "stamp" lands in your personal eco passport — each one anchored on Solana, so it's tamper-proof and can only be used once. Stamps come from anywhere: an online order, a card in your parcel, a café counter. Collect enough and you mint a soulbound "eco warrior" NFT. Your passport fills with real brand stamps and badges, and becomes a gorgeous card you share on social: "I'm eco, and here's the proof."

It's for conscious shoppers who want their values to be visible and rewarded. And it's for sustainable brands — like our showcase brand SuperBee, a certified B Corp — because customers proudly broadcasting verified stamps is the most credible marketing there is. Customers want the status; brands get the growth. That's the engine.

*(911 chars)*

### Why did you decide to build this, and why build it now? (≤1000 chars)
I run SuperBee, a certified B Corp eco brand, so I see both sides of this. Customers tell us they care about sustainability, but they've got no way to prove it, even to themselves. And brands doing the real work get drowned out by ones that just claim to be green. Everyone's making eco choices into a void.

EcoProof makes those choices visible and verifiable. People get a badge of identity they're genuinely proud to share, and that sharing is exactly what credible brands have been missing.

Why now: Solana means we can anchor every stamp and mint collectible rewards (compressed NFTs) for fractions of a cent — impossible to afford before. Conscious consumerism has gone mainstream, trust and proof are the missing pieces, and the on-chain cost barrier has finally gone. As a real eco shop owner, I can build it and be its first user from day one.

*(853 chars)*

### What technologies are you using or integrating with? (≤400 chars)
Next.js (App Router), React and Tailwind on Vercel. Solana anchors every stamp as an on-chain proof and mints soulbound compressed NFTs via Metaplex Bubblegum. Code-drawn generative SVG gives each wallet its own eco warrior. Anthropic's Claude API maps unknown products to impact. PostgreSQL (Neon) for passports and stamps. WooCommerce webhooks for brand onboarding. Dynamic share cards via next/og.

*(400 chars)*

### How does your product use these chains? (Solana, ≤500 chars)
Solana is the trust layer. Every valid claim writes a proof on-chain, so each stamp is a tamper-proof, publicly verifiable record, and a claim account on Solana makes each code or order usable only once. At milestones we mint soulbound compressed NFTs (Metaplex Bubblegum) as eco-warrior badges, costing fractions of a cent so it scales to every customer. Solana does the proving, not the paying.

*(396 chars)*

### Did anyone not listed on the team do meaningful work? (≤600 chars)
No one outside the team. This was built solo by me. I used AI assistants — Anthropic's Claude — heavily during development, for coding, design and talking through product decisions. But all the concept, direction and decisions are my own. Claude is also part of the product itself, mapping products to their impact, so AI is both how I built it and part of how it works.

*(370 chars)*

### Anything else judges should know? (≤500 chars)
I'm not a hypothetical founder. I run SuperBee, a certified B Corp eco brand, so EcoProof is built by its own first real user — grounded in a genuine problem, not a pitch deck. I can walk through the whole loop with real products. And the stamp model works across every channel — online, in-store, even marketplace parcels — so any eco business can join in minutes with nothing but a QR code. Customers get the pride of "I'm eco, and I have proof." Brands get the growth.

*(471 chars)*

### Notes for judges (the longer, honest version, for the README or follow-up questions)
- **Built and working:** places with QR, stamp art and counter cards; self-serve setup at `/join`; three claim doors (place QR, printed parcel card, verified WooCommerce order); a Solana proof for every claim with on-chain once-only enforcement; soulbound milestone NFTs with four levelling tiers and an individual character per wallet; a glass-style passport; a shareable passport image with one-tap posting; a map of joined places; eco rules with customer reporting and review.
- **WooCommerce** was tested end to end on a local staging shop (completed order, signed webhook, QR in the order email, claim, stamp with the real impact line). It is not installed on the live SuperBee shop yet.
- **Honest limits:** only the verified-order door proves a purchase; QR and card stamps are generic. GPS checks stop casual abuse but can be spoofed. Impact figures are estimates from a hand-built factor table. Self-serve places are not independently vetted: the map's "verified" means claimed and set up on EcoProof. NFTs are on devnet and may not show in every wallet.
- **Removed on purpose:** an earlier version scanned receipt photos with AI. We replaced it because the proof should come from the shop, not from a customer photo.
- **Roadmap:** marketplace order emails (Amazon, Shopee, Lazada) with DKIM verification; Shopify; owner dashboard and editing; on-chain brand certification (for example B Corp); independent vetting of places; mainnet.

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
