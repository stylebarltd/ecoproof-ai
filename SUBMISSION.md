# EcoProof AI: submission text and demo script

Live app: https://ecoproof.superbee.me
Code: https://github.com/stylebarltd/ecoproof-ai
Chain: Solana devnet (proofs and soulbound compressed NFTs)

Tagline: **"I'm eco, and I have proof."**

---

## Submission form answers

Chain: **Solana**. Category: **Consumer / Climate**. Mobile-focused: **yes**, a mobile-first PWA built around scanning, tapping links, mobile wallets and sharing.

### Project blurb
Eco-conscious people buy sustainable products every day, but they have nothing to show for it and nobody can check it. With EcoProof, after a purchase or a café visit, you scan a QR code and get a stamp in your eco passport. Each stamp is recorded on Solana, so it can't be faked or reused. Collect enough stamps and you unlock a Bee Guardian NFT. People share their passport, and the shops they chose gain new customers.

I run SuperBee, a certified B Corp eco brand with about 15 resale points in Chiang Mai and 5 or more in Bangkok. EcoProof is in beta, and we're starting in Chiang Mai with Freebird Cafe, Adorn with Studio Naena, Alt Coliving & Coworking and Good Souls Vegan Restaurant, plus our SuperBee resale points. Goal for the first month: 10 places and 5 founders.

### Brief description (<=500 chars)
"I'm eco, and I have proof." Scan a QR code after an eco purchase or a café visit and collect a stamp in your eco passport. Every stamp is recorded on Solana, so it can't be edited or used twice. Collect enough and you unlock a Bee Guardian NFT. People share their passport, and the shops they chose get new customers. In beta, starting in Chiang Mai with eco cafés and the SuperBee resale network.

### What are you building and who is it for? (<=1000 chars)
Lots of people care about sustainability but have nothing to show for it. EcoProof gives them proof.

After an eco purchase you scan a QR code or tap a link and get a stamp in your passport. Stamps come from a café counter, a card in a parcel, or an online order. Each stamp is recorded on Solana. Collect enough and you unlock a Bee Guardian NFT, from Sentinel up to Paragon. Your passport becomes a card you can share.

It's for people who want their eco choices to be visible, and for eco brands, because customers showing off real stamps brings in new customers.

We start in Chiang Mai, with cafés, a vegan restaurant, a coliving space, a boutique and the SuperBee resale points. Bangkok is next, then other cities and online shops anywhere.

### Why this, and why now? (<=1000 chars)
I run SuperBee, a certified B Corp eco brand. Customers tell me they care, but they can't show it. And brands doing real work get drowned out by ones that only claim to be green.

EcoProof makes eco choices visible and checkable. People get something they're proud to share, and honest brands get the customers that sharing brings.

Why now: Solana makes it cheap enough to record every stamp and mint a reward for fractions of a cent. Eco shopping is mainstream, and trust is the missing piece. I already have the distribution: 20 or more SuperBee resale points across Chiang Mai and Bangkok, and a community of eco cafés and founders.

### Technologies (<=400 chars)
Next.js and React on Vercel. Solana records each stamp and mints soulbound compressed NFTs with Metaplex Bubblegum. Claude (Anthropic) estimates the impact of products. PostgreSQL (Neon) stores passports and stamps. WooCommerce connects online shops. Share cards are generated with next/og.

### How does it use Solana? (<=500 chars)
Solana is the trust layer. Every stamp is recorded on-chain, and an on-chain claim account makes each code or order usable only once. At milestones we mint soulbound compressed NFTs as Bee Guardian badges, which cost fractions of a cent. Solana does the proving, not the paying.

### Team and outside help (<=600 chars)
Built solo. I used Anthropic's Claude heavily for coding, design and product thinking. The concept, direction and decisions are mine. Claude also runs inside the product, estimating the impact of products.

### Anything else we should know? (<=500 chars)
I'm building this full-time. I'm not a hypothetical founder: I run SuperBee, a certified B Corp brand, so I'm the product's first user and I already have places to launch. The app runs on Solana devnet, and impact figures are estimates. Only a verified WooCommerce order proves a purchase. Next steps: onboard the Chiang Mai partners, then mainnet.

### Runway
Self-funded through SuperBee. I plan to keep building after the hackathon. On-chain costs are tiny, so I can cover the SOL for the first partners myself. Support would help me move faster on onboarding and mainnet.

### Feedback
The timeline was very short. I came up with the idea at the ideathon on Friday and built the working product in the days after. I focused on the core loop (scan, stamp, on-chain proof, NFT) and would have liked more time to test with real shops before submitting.

### Notes for judges (the longer, honest version, for the README or follow-up questions)
- **Two classes of stamp, one passport:** a verified purchase (WooCommerce order, real impact line, premium look, 5 points) and a presence stamp (place QR or parcel card, 1 point). Milestones count points; the values are two constants.
- **Built and working:** places with QR, stamp art and counter cards; self-serve setup at `/join`; three claim doors (place QR, printed parcel card, verified WooCommerce order); a Solana proof for every claim with on-chain once-only enforcement; soulbound milestone NFTs with four levelling tiers and an individual character per wallet; a glass-style passport; a shareable passport image with one-tap posting; a map of joined places; eco rules with customer reporting and review.
- **WooCommerce** was tested end to end on a local staging shop (completed order, signed webhook, QR in the order email, claim, stamp with the real impact line). It is not installed on the live SuperBee shop yet.
- **Honest limits:** only the verified-order door proves a purchase; QR and card stamps are generic. GPS checks stop casual abuse but can be spoofed. Impact figures are estimates from a hand-built factor table. Self-serve places are not independently vetted: the map's "verified" means claimed and set up on EcoProof. NFTs are on devnet and may not show in every wallet.
- **Removed on purpose:** an earlier version scanned receipt photos with AI. We replaced it because the proof should come from the shop, not from a customer photo.
- **Roadmap:** marketplace order emails (Amazon, Shopee, Lazada) with DKIM verification; Shopify; owner dashboard and editing; rate your purchase (online shop or local coffee shop, backed by the order or stamp); on-chain brand certification (for example B Corp); independent vetting of places; mainnet.

---

## Demo video script (Loom, under 2 minutes, phone screen recording)

Goal: one user, one loop (scan, stamp, proof). Simple words, no jargon. The main flow is a verified online order, because it is the one door that proves a purchase and shows real impact.

**Before recording**
- Fresh browser profile and a wallet connected in the app, with no stamps, so the order alone unlocks the first Bee Guardian live (a verified order is 5 points).
- Have the order-completed email from the shop ready on a second screen, with its QR. Keep Solana Explorer open in a second tab.
- The paying wallet `7mczVi8f1MX8Z61q2ezdMcku3N2XpG1fHHbDz136rWnt` needs devnet SOL.
- Add one real number in your voice if you have it (places signed up, stamps collected).

| Time | On screen | Say |
|---|---|---|
| 0:00 | You, or the logo, then the empty passport | "I'm Lutz. I run SuperBee, a certified B Corp eco brand, and I'm building EcoProof full-time. People care about eco choices, but they have nothing to show for them, and nobody can check." |
| 0:12 | The order-completed email with the QR | "I just bought from an online eco shop. In the order email there's a QR code." |
| 0:20 | Scan the QR, then the claim page: "Your order: 110 single-use plastics avoided", then **Collect stamp** | "It knows my real order and what it saved. I tap Collect." |
| 0:30 | The checklist runs: proof on Solana, saving, minting | "It's writing the proof to Solana and saving it to my passport. Because this stamp is a verified purchase, it also unlocks my first Bee Guardian." (Keep talking through the 10 to 15 seconds.) |
| 0:55 | "Stamp collected", the NFT, then **Verify on-chain** to Explorer | "Every stamp has a public, timestamped proof, and an order can't be used twice." |
| 1:10 | Passport with the NFT as hero, then **Share my passport** | "I can't buy this Bee Guardian, I can only earn it. And this card is what I share, so my friends find the shops I chose." |
| 1:25 | `/join` form, then the generated counter card | "A café joins in a minute: logo, tagline, and the app makes their QR." |
| 1:40 | Map or logo | "It's in beta, starting in Chiang Mai with eco cafés and the SuperBee resale points, on Solana devnet. EcoProof: scan, collect, unlock." |

Left out on purpose: parcel cards and café QR stamps as a main flow. Mention them only if a judge asks, using the longer version below.

### Longer backup version (about 2 minutes, with the order-email door)

**Before recording**
- Use a fresh browser profile and a wallet with no stamps. Connect it on the app, so NFTs mint to it.
- Collect the first two stamps beforehand (SuperBee and Demo Café) so the third stamp triggers a milestone live. Keep Solana Explorer open in a second tab.
- Have the order-completed email from the staging shop ready (or open the signed link directly), and a printed counter card or a QR on a second screen.
- The wallet that pays for proofs needs devnet SOL (`7mczVi8f1MX8Z61q2ezdMcku3N2XpG1fHHbDz136rWnt`); each proof costs a tiny amount.

| Time | On screen | Say |
|---|---|---|
| 0:00 | Open the app: the logo splash fades into the passport | "Sustainable brands can't easily show that real people chose them. EcoProof turns every scan into a stamp, and every stamp is proven on Solana." |
| 0:10 | Passport hero: Sentinel NFT, stamp collection (2 stamps), progress "2 points · 1 to Warden" | "This is my eco passport. Two stamps, and one more unlocks my next Bee Guardian." |
| 0:20 | Scan the Demo Restaurant QR (or open the link) → the claim page → **Collect stamp** | "A restaurant puts this QR on the counter. I scan it." |
| 0:28 | The checklist runs: checking, writing the proof to Solana, saving, updating progress, minting your NFT | "Right now it's writing a proof to Solana, saving it to my passport, and since this is my third stamp, minting a collectible." |
| 0:50 | Done: "Stamp collected", Warden NFT; tap *See the proof on Solana* → Explorer | "Every stamp has a public, timestamped proof. And that scan can never be reused, because Solana won't create the same claim account twice." |
| 1:05 | Passport: Warden is now the hero (larger), Sentinel beside it, higher ranks as silhouettes; tap the NFT → Explorer | "My new Warden is soulbound: I can't sell it, I can only earn it. Every rank is a different Bee Guardian, so it visibly levels up." |
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
4. Rate your purchase: review the online shop or local coffee shop you bought from, backed by the order or stamp that proves it (one review per purchase, anchored on Solana)
5. Independent vetting of places, abuse tools
6. Mainnet
