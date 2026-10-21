# EcoProof NFT Collection Spec (v2, 21 Oct 2026)

EcoProof has two collections, with different rules for each. Both use one character, the Bee Guardian, in one art style (ink and crosshatch), and share one trait system.

## 1. Rank Cards: open supply, always earnable

| Rank      | Points | Supply | Outfit (fixed per rank)                                   |
|-----------|--------|--------|-----------------------------------------------------------|
| Sentinel  | 1      | open   | kraft felt vest, green leaf patch, leather backpack        |
| Warden    | 3      | open   | kraft vest + short woven leaf cloak, brass-buckle backpack |
| Guardian  | 10     | open   | leather vest, riveted iron shoulders, iron-clasp backpack  |
| Vanguard  | 25     | open   | honeycomb bronze-gold chest armour, backpack with map      |
| Paragon   | 50+    | open   | gold honeycomb armour, laurel crown, gold-trimmed backpack |

Points: a verified purchase earns 5 and a presence scan earns 1 (constants `POINTS_VERIFIED` and `POINTS_PRESENCE`).

Rules
- A rank card is a trophy. Everyone who reaches the threshold gets one. Rank cards are never capped and never "sold out".
- Rank cards are soulbound (non-transferable) and minted as compressed NFTs on Solana.
- Scarcity comes from the serial number. Cards are minted in order per rank, for example `Paragon #12`.
- Every card is unique through its trait layers (section 3) and personalisation (section 4).
- A wallet holds one card per rank. Reaching a higher rank does not burn the lower one.

## 2. Achievement Cards: capped, dated, seasonal

Achievements mark moments, not tiers. Each one shows the same bee holding a different item. Limited editions, seasons and giveaways all happen in this collection.

Examples (first ~10):

| Achievement            | Trigger                                      | Cap            |
|------------------------|----------------------------------------------|----------------|
| First Proof            | first verified purchase ever                 | open           |
| Founding 500           | first 500 verified orders on SuperBee        | 500            |
| Plastic-Free Kilo      | 1 kg single-use plastic avoided (verified)   | open           |
| Carbon Ton             | 1 t CO2e avoided (verified)                  | open           |
| Café Regular           | 10 presence stamps at one café               | open           |
| Explorer               | stamps at 10 different places                | open           |
| Earth Day 2027         | any proof on 22 Apr 2027                     | 1,000          |
| Founding Café          | one per launch-partner venue (owner wallet)  | 1 per venue    |
| Season One             | any rank reached before Season One closes    | closes on date |
| Ambassador             | manual award, giveaways/partners             | reserve 200    |

Rules
- Caps and dates are set when an achievement is created and written into the collection metadata. Once a cap or date is reached, the achievement closes permanently.
- Seasons apply to achievements only. A seasonal edition gets its own colourway and background set, and its own cap.
- Achievements cannot be sponsored by a brand or bought. They are earned or awarded only.
- EcoProof holds a reserve of 200 "Ambassador" cards for giveaways, partners and early supporters.

## 3. Trait layers (shared by both collections)

Card art is composited at mint time from transparent PNG layers. There is no image generation per mint.

Layer order (bottom → top)
1. `background`: flat colour or pattern, 8 variants (periwinkle, dusty blue, terracotta, honey, cream, kraft, sage-grey, night-brown)
2. `aura`: 5 variants (none, soft glow, gold outline, sparks, halo-rays). Each rank sets a minimum aura; only achievements randomise it upward.
3. `bee_base`: the rank outfit, 5 files named `<rank>_card.png`. Each is transparent, 1024x1024 and framed chest-up (cropped at the vest hem, no legs).
4. `item`: what the bee holds, 8+ variants (none, beeswax wrap, bamboo cup, parcel, honey jar, compass, map, seedling, tote bag). Achievements fix the item; ranks randomise it.
5. `badge`: a small collar or vest badge, 5 variants (leaf, stamp, globe, star, heart)
6. `frame`: the card frame SVG, with rank colour, name, serial and personalisation text

Minimum aura per rank: Sentinel none, Warden glow, Guardian gold outline, Vanguard sparks, Paragon halo-rays.

Uniqueness: the random slots give 8 × 8 × 5 = 320 combinations per rank before serial and personalisation, so in practice no two cards are identical.

Randomisation is deterministic from `hash(wallet + collection + serial)`, so re-renders are reproducible.

## 4. Personalisation (frozen at mint)

These details are rendered into the frame and stored in the metadata:
- rank or achievement name and serial (`Guardian #381`)
- the holder's impact numbers at that moment (plastic avoided in g, CO2e in g, stamp count)
- name and logo of the brand or place whose proof triggered the mint
- mint date
- season label (achievements only)

## 5. Metadata (Metaplex standard)

```
name: "EcoProof Guardian #381"
symbol: "ECOPROOF"
attributes:
  collection: rank | achievement
  tier: Guardian
  serial: 381
  background: terracotta
  aura: gold outline
  item: bamboo cup
  badge: leaf
  plastic_avoided_g: 1420
  co2e_avoided_g: 9800
  stamps: 11
  unlocked_by: SuperBee
  minted_at: 2026-11-03
  season: (achievements only)
  cap: (achievements only)
```

## 6. Asset production checklist

- [x] `sentinel_card.png`: transparent, chest-up, cropped at the vest hem
- [x] `warden/guardian/vanguard/paragon_card.png`: made by img2img with a ControlNet canny guide at 0.75, with head, hand and wings composited back from the Sentinel and the background removed (Paragon crown added by a separate inpaint)
- [ ] 8 background PNGs (flat colour, paper grain)
- [ ] 5 aura PNGs (transparent)
- [ ] 9 item PNGs (transparent, positioned for the free hand)
- [ ] 5 badge PNGs
- [ ] frame SVG template with text slots
- [ ] compositor script + deterministic trait picker
- [ ] 64 px readability check for every layer combination of each rank
