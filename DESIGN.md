---
name: EcoProof AI
description: A stamped travel journal for real eco choices, verified on Solana.
colors:
  paper: "#f4e9d8"
  kraft: "#d9b88c"
  kraft-deep: "#b8905f"
  cocoa: "#3a2a1c"
  honey: "#e08a2e"
  honey-deep: "#b96a1d"
  terracotta: "#c9704e"
  sky: "#8fa9c8"
  leaf: "#6f8f4e"
  honey-light: "#eda055"
  honey-ink: "#8f4c10"
  sky-ink: "#36557c"
  terracotta-ink: "#8c4325"
  leaf-ink: "#45602d"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2.25rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.01em"
    fontVariation: "\"opsz\" 96"
  display-tablet:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "2.875rem"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(1.875rem, 4vw, 2.375rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.01em"
    fontVariation: "\"opsz\" 96"
  title-lg:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.15
  title:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.3
  lead:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  caption:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.5
  micro:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.3
  figure:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.625rem"
    fontWeight: 700
    lineHeight: 1
  figure-lg:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1
  label:
    fontFamily: "\"Bebas Neue\", Impact, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.12em"
rounded:
  md: "12px"
  sticker: "14px"
  card: "20px"
  panel: "24px"
  device: "38px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "24px"
  xl: "40px"
  section: "56px"
components:
  button-primary:
    backgroundColor: "{colors.honey}"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.honey-light}"
  button-ink:
    backgroundColor: "{colors.cocoa}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-ink-hover:
    backgroundColor: "{colors.honey-ink}"
  link-underline:
    textColor: "{colors.cocoa}"
    typography: "{typography.title}"
  card-sticker:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.card}"
    padding: "24px"
  card-stitched:
    backgroundColor: "{colors.kraft}"
    rounded: "{rounded.card}"
    padding: "40px 20px"
  stamp-mark:
    textColor: "{colors.sky-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  nav-link:
    textColor: "{colors.cocoa}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  code-snippet:
    backgroundColor: "{colors.cocoa}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "12px"
---

# Design System: EcoProof AI

## Overview

**Creative North Star: "The Stamped Travel Journal"**

EcoProof looks like a well-used travel journal: warm paper pages, kraft board, rubber stamps inked a little crooked, stickers with a white edge, stitched borders. Each stamp is proof the person was really there, which is the product's whole promise. The material is honest and handmade, never glossy or techy. Solana shows up only as a quiet line of ink you can check, never as neon chrome.

The journal was built first on the landing page (`components/landing/`, tokens in `app/globals.css` under the travel-journal `@theme`), and it is the target for the whole product. The app screens still use an older "passport glass" look: frosted white panels on a sage-green gradient, Caprasimo and Figtree, terra and honey-500 buttons (`.passport-bg`, `.glass`, the `terra-*`, `sage-*`, `neutral-*` scales). Treat that look as legacy. Keep it working, but new app work moves toward the journal instead of extending the glass.

All art comes from one place: the cel-shaded Bee Guardian card set (five rank personas). Imagery is either that art, or photos with the real QR card, receipt or screen composited in. No other illustration style.

**Key Characteristics:**
- Warm paper and kraft surfaces with CSS grain; cocoa ink instead of black.
- Honey as the one action colour; sky blue as the "ink" of links and stamps.
- A characterful serif for headlines, a rounded sans for reading, condensed capitals only inside stamps and labels.
- Depth from paper layering (stickers, stitching, vignette), not from glass or heavy shadows.
- Real records and real numbers on the page, with links to their proof.

## Colors

An earthy, sun-warmed palette: paper and kraft underfoot, cocoa ink, honey for action, a dusty sky blue for anything you can follow or check.

### Primary
- **Wildflower Honey** (honey): the call to action, as a fill. Primary buttons carry cocoa text on it (5.1:1); white on honey fails contrast. Hover lightens to **Light Honey** (honey-light). **Burnt Honey** (honey-deep) is a fill and border shade only.
- **Honey Ink** (honey-ink): honey as text: the "AI" in the wordmark, the hero's "Verified, not claimed.", the one highlighted number in a row, and the hover of ink buttons.

### Secondary
- **Faded Sky** (sky): link underlines (3px, offset 4px), stamp rings and icons. It says "you can follow this". Hovering a link turns its underline honey. Never text.
- **Sky Ink** (sky-ink): the text inside stamps and stamp labels.

### Tertiary
- **Clay Terracotta** (terracotta): warm fills and the "failed" mark of a check. Never a button, never text. **Terracotta Ink** (terracotta-ink) is its text form: card labels and error lines.
- **Bee Leaf** (leaf): the bee's leaf patch and small success ticks and icons only, such as the pulse behind the "Eco Passport" nav link when this device already has stamps. Never a background or a large fill. **Leaf Ink** (leaf-ink) is its text form, for the word inside a "verified" stamp.

### Neutral
- **Journal Paper** (paper): the page and sticker surface.
- **Kraft Board** (kraft): hero and feature panels, often at 50 to 60% over paper. **Deep Kraft** (kraft-deep) is the darker board edge.
- **Cocoa Ink** (cocoa): all text, at full strength for headings, 85% for body and 80% for secondary lines (never lighter: below 80% it fails contrast on kraft); dark buttons, the phone frame and code blocks. Hairlines are cocoa at 10%.

### Named Rules
**The One Honey Rule.** Honey marks the single next action in a view. If two things are honey, one of them is wrong.

**The Leaf Is Small Rule.** Green is a detail (a leaf, a tick, a pulse), never a surface. The sage-green app backgrounds are legacy.

**The Ink Rule.** Text in an accent colour always uses that accent's ink token (honey-ink, sky-ink, terracotta-ink, leaf-ink). The light accents are for fills, rings, underlines and icons. Every text pair meets 4.5:1, or 3:1 at headline size.

## Typography

**Display Font:** Fraunces (with Georgia), optical size axis set to 96
**Body Font:** Nunito (with system-ui)
**Label/Mono Font:** Bebas Neue (with Impact), for stamps and labels only

**Character:** Fraunces brings a hand-set, slightly old-world warmth to big statements. Nunito's rounded strokes keep reading friendly and practical. Bebas is the rubber stamp: condensed, uppercase, tracked out.

### Hierarchy
- **Display** (700, 36px phone → 46px → 56px desktop, line-height 1.04): the hero headline, and the closing call to action at 36 → 46px.
- **Headline** (700, 30px → 38px, line-height 1.08): section headings.
- **Title large** (Fraunces 700, 22px): card and step headings.
- **Title** (Nunito 800, 18px, snug): small card headings, link CTAs.
- **Lead** (Nunito 400, 18px, line-height 1.6): the paragraph under a heading.
- **Body** (Nunito, 16px; 15px for secondary body, line-height about 1.5 to 1.6, cocoa at 85%): paragraphs, up to about 65ch.
- **Label** (Bebas 400, 14 to 15px, tracking 0.12 to 0.14em, uppercase): card labels in terracotta ink, stamp text, counter tiles, captions over a column.
- **Caption** (Nunito 700, 13 to 14px, cocoa at 80%): notes, dates, setup lines, footnotes.
- **Micro** (Nunito 700, 12px): the smallest text, only inside device mock-ups and stamps. Nothing smaller.
- **Figure** (Fraunces 700, 26px; 36px for the one big number): counters and impact totals.

### Named Rules
**The Stamp-Only Capitals Rule.** Uppercase and tracking belong to Bebas inside stamps, card labels and counters. Headlines and body are never set in capitals.

**The Heading Stands Alone Rule.** No label, kicker or stamp sits directly above a section heading or the hero headline; the heading carries its own weight.

**The Numbers in Serif Rule.** Key figures (impact totals, counters) are set in Fraunces 700 so they read as written down, not as dashboard digits.

## Layout

Content sits in a centred container up to 1200px wide; reading blocks narrow to `max-w-xl` / `max-w-3xl`, and a few focused sections use 880px. Phone first: one column, full-width CTAs (`w-full` that becomes auto from `sm`). The desktop breakpoint is 1024px (`lg`): the hero becomes a two-column split at about 86vh, card fans open wider, and rotations are halved below it. Sections breathe with about 40 to 56px of vertical padding; cards use 20 to 24px internal padding, 40px and up for feature panels. Horizontal card strips snap per card (`.scroll-snap-x`).

## Elevation & Depth

Depth is paper on paper. Surfaces are flat; what lifts them is the way real stationery lifts: a sticker's soft shadow and white edge, a dashed stitch inset 10px, a faint vignette on kraft, and a 4% noise grain multiplied over paper and kraft. Ink (stamps, stamp SVGs) uses `mix-blend-mode: multiply`, so it sinks into the paper instead of floating on it.

### Shadow Vocabulary
- **Sticker** (`box-shadow: 0 1px 0 rgba(255,255,255,0.8) inset, 0 6px 18px rgba(58,42,28,0.14)` with a 3px white outline): stickers and the cards built from them.
- **Honey glow** (`box-shadow: 0 8px 22px rgba(224,138,46,0.38)`): only under the primary honey button.
- **Device** (`box-shadow: 0 24px 50px rgba(58,42,28,0.3)`): the phone mock-up, the one object that really stands up off the page.

### Named Rules
**The No Glass Rule.** No `backdrop-filter` frosted panels in new work. The sticky nav's light blur on paper at 95% is the one allowed exception. `.glass` and `.lg-glass` are legacy.

## Shapes

Soft, hand-cut corners: stickers at 14 to 18px, cards at 20px, big panels at 24px, the phone at 38px. Buttons, nav links and round stamps are full pills. Stamps are a double ring (2.5px solid plus a 1.5px dashed outline inset 7px), tilted a few degrees (`-rotate-6`) as if pressed by hand. Square counter stamps use the same rings at a 14px radius. Hero cards fan out at resting rotations (`--r`) and open on hover (`--ro`).

## Components

### Buttons
Round, warm and sure of themselves, like a pressed paper token.
- **Shape:** full pill (9999px).
- **Primary:** Wildflower Honey with cocoa Nunito 800 at 16px, 48px tall, 24px side padding, with the honey glow under it; full width on phones. One per view (the One Honey Rule): the nav's "Join as a business" is an ink button so it never competes with the hero.
- **Hover / Focus:** hover lightens to Light Honey. Keyboard focus everywhere is a 3px honey outline offset 2px. On real pointers, `.lift` raises 2px with a honey ring.
- **Ink:** Cocoa with paper text, 44px tall, 14 to 15px Nunito 800; hover turns Honey Ink. For the nav's join button and secondary actions inside a card ("Get yours", "Check this record now").
- **Link CTA:** no box, Nunito 800 cocoa text with a 3px Faded Sky underline offset 4px, turning honey on hover. The standard secondary action ("See a live passport").

### Cards / Containers
- **Sticker card:** paper (or kraft at 60%), 16 to 20px radius, sticker shadow and white edge, cocoa hairline at 10%, 20 to 32px padding, grain.
- **Stitched panel:** kraft (full, or 50 to 55% over paper), 20 to 24px radius, dashed cocoa 28% stitch inset 10px, grain. For feature and pricing blocks and the closing CTA.
- **Shadow strategy:** see Elevation & Depth. Never stack a shadow on a stitched panel.

### Navigation
The landing nav is sticky, paper at 95% with a light blur and a cocoa 10% bottom hairline. Links are pills in Nunito 700 at 15px, cocoa at 80%, and on hover they fill with kraft at 40% and go full cocoa. The "Eco Passport" link pulses Bee Leaf when this device has stamps. (The app's legacy bottom nav, on cream with sage active states, is due to move to this language.)

### Stamp mark (signature)
An inked rubber stamp: Bebas uppercase in sky ink or terracotta ink, double ring, slight tilt, multiplied onto the paper. It marks proof, ranks, counters and "verified" moments. It is decoration with meaning: only put a stamp on something that was really stamped or verified.

### Bee Guardian card (signature)
The cel-shaded rank cards (Sentinel, Warden, Guardian, Vanguard, Paragon), drawn with the card frame from `lib/beeCardOg.tsx`: paper, a rank-coloured rim, Caprasimo and Figtree on the card itself. They are collectible objects laid onto the journal, not part of its typography.

### Code snippet
For the badge embed: cocoa at 90% with paper text at 90%, 12px mono, 12px radius, a copy button on the right.

## Do's and Don'ts

### Do:
- **Do** build new screens on paper and kraft with cocoa ink, using the journal tokens in `app/globals.css`.
- **Do** give each view one honey action, with cocoa text; make secondary actions sky-underlined link CTAs or ink buttons.
- **Do** use the ink token whenever an accent colour is text.
- **Do** put grain (`.grain`) on paper and kraft surfaces, and multiply ink onto them.
- **Do** link every shown number or record to its live proof, styled as a sky-underlined link.
- **Do** keep all motion behind `prefers-reduced-motion` (fan, bob, pulse, pop), as the existing CSS does.
- **Do** use only the cel-shaded Bee Guardian art, or photos with the real card, receipt or screen composited in.

### Don't:
- **Don't** add frosted glass panels or the sage-green gradient to new work; they are legacy.
- **Don't** use leaf green as a background or large fill.
- **Don't** set headlines or body copy in uppercase; capitals belong to Bebas stamps and labels.
- **Don't** use pure black or pure grey; text is cocoa, never lighter than 80%.
- **Don't** put white text on honey, or set sky, terracotta or leaf as text.
- **Don't** set text below 12px.
- **Don't** put a small label or eyebrow above a heading.
- **Don't** mix in other illustration styles, stock vectors or AI art in another style.
- **Don't** stamp something that wasn't verified; the stamp means proof.
