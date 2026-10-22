// EcoProof card compositor (prototype for docs/nft-collection-spec.md, sections 3–5).
//
// Stacks the transparent layers (background → aura → bee_base → badge → item in its slot or bubble),
// drops the art into the card frame SVG with the personalisation text, and writes the PNG
// plus Metaplex-style metadata. Traits come from a deterministic pick, so the same
// wallet + collection + serial always renders the same card.
//
// Usage (from the repo root, so sharp resolves from node_modules):
//   node art/v2/compositor/compose.mjs '{"collection":"rank","tier":"guardian","serial":381,
//     "wallet":"…","impact":{"plastic_g":1420,"co2e_g":9800,"stamps":11},
//     "unlocked_by":"SuperBee","logo":"logo.png","minted_at":"2026-11-03"}' out/guardian-381

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// librsvg finds the frame fonts (Caprasimo, Figtree) through this fontconfig file; must be set before sharp loads.
process.env.FONTCONFIG_FILE ??= join(HERE, "../layers/frame/fonts/fonts.conf");
const sharp = (await import("sharp")).default;

const T = JSON.parse(readFileSync(join(HERE, "traits.json"), "utf8"));
const LAYERS = resolve(HERE, T.layers_dir);
const RANKS = resolve(HERE, T.ranks_dir);
const FRAME = readFileSync(join(LAYERS, "frame/frame.svg"), "utf8");

// ---- deterministic trait picker -------------------------------------------------------

// Bytes of sha256(wallet|collection|serial); each trait reads its own byte so adding a trait never reshuffles the others.
export function traitSeed(wallet, collectionKey, serial) {
  return createHash("sha256").update(`${wallet}|${collectionKey}|${serial}`).digest();
}

const pick = (list, byte) => list[byte % list.length];

export function pickTraits(card) {
  const key = card.collection === "rank" ? `rank:${card.tier}` : `achievement:${card.tier}`;
  const h = traitSeed(card.wallet, key, card.serial);
  if (card.collection === "rank") {
    const rank = T.ranks[card.tier];
    if (!rank) throw new Error(`unknown rank ${card.tier}`);
    return {
      // some backgrounds are too close to the rank's own colours at 64 px (e.g. gold armour on honey)
      background: pick(T.backgrounds.filter((b) => !(rank.exclude_backgrounds ?? []).includes(b)), h[0]),
      aura: rank.aura, // ranks get exactly their minimum aura
      item: pick(T.items, h[1]),
      badge: pick(T.badges, h[2]),
    };
  }
  // Achievements: item fixed by the achievement, aura randomised upward from its minimum,
  // background from the season's set when there is one.
  const minAura = Math.max(0, T.auras.indexOf(card.aura_min ?? "none"));
  return {
    background: pick(card.backgrounds ?? T.backgrounds, h[0]),
    aura: T.auras[minAura + (h[1] % (T.auras.length - minAura))],
    item: card.item ?? "none",
    badge: pick(T.badges, h[2]),
  };
}

// ---- formatting -----------------------------------------------------------------------

const nf = (n, d) => n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: 0 });
export function mass(g) {
  if (g >= 1e6) return `${nf(g / 1e6, 2)} t`;
  if (g >= 1e3) return `${nf(g / 1e3, g >= 1e5 ? 0 : 1)} kg`;
  return `${nf(g, 0)} g`;
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);

function logoHref(logo) {
  if (!logo) return "";
  if (logo.startsWith("data:") || logo.startsWith("http")) return logo;
  const buf = readFileSync(resolve(logo));
  const type = logo.endsWith(".svg") ? "image/svg+xml" : logo.endsWith(".jpg") || logo.endsWith(".jpeg") ? "image/jpeg" : "image/png";
  return `data:${type};base64,${buf.toString("base64")}`;
}

// ---- render ---------------------------------------------------------------------------

// Items have no hand to sit in, so they are presented: in a round slot (rank cards) or in a
// speech bubble from the bee (achievements). Both are drawn here around a trimmed item PNG.
const INK = "#3A2A1C";
const PAPER = "#FBF5EA";
function itemFrameSvg(mode, colour) {
  if (mode === "slot") {
    const { cx, cy, r } = T.item_slot;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
      <defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter></defs>
      <circle cx="${cx + 8}" cy="${cy + 12}" r="${r}" fill="#28180c" opacity="0.35" filter="url(#s)"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${PAPER}" stroke="${INK}" stroke-width="8"/>
      <circle cx="${cx}" cy="${cy}" r="${r - 16}" fill="none" stroke="${colour}" stroke-width="6"/>
    </svg>`;
  }
  const { cx, cy, rx, ry, tail } = T.item_bubble;
  const t = tail.map((p) => p.join(",")).join(" ");
  // ink layer = shapes stroked wide, paper layer = same shapes filled, so the tail joins the bubble seamlessly
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
    <g fill="${INK}" stroke="${INK}" stroke-width="16" stroke-linejoin="round"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/><polygon points="${t}"/></g>
    <g fill="${PAPER}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/><polygon points="${t}"/></g>
  </svg>`;
}

async function itemLayers(item, mode, colour) {
  if (item === "none") return [];
  const box = mode === "slot" ? T.item_slot : T.item_bubble;
  const img = await sharp(join(LAYERS, "item", `${item}.png`))
    .resize(box.item_size, box.item_size, { fit: "inside" })
    .png()
    .toBuffer();
  const { width, height } = await sharp(img).metadata();
  return [
    { input: Buffer.from(itemFrameSvg(mode, colour)) },
    { input: img, left: Math.round(box.cx - width / 2), top: Math.round(box.cy - height / 2) },
  ];
}

// The gold outline aura follows the bee's own silhouette (each rank has its own pose since the personas), so it is built from
// the card's alpha: dilated ~22 px, soft edge, gold (#FFD678) with a faint outer glow. The other auras are free-standing layers.
async function goldOutline(beeFile) {
  const alpha = await sharp(beeFile).ensureAlpha().extractChannel("alpha").toBuffer();
  const dilated = await sharp(alpha).blur(11).threshold(8).blur(1.2).toBuffer();          // solid silhouette grown by the blur radius
  const glow = await sharp(alpha).blur(26).linear(1.6, 0).toBuffer();                     // faint halo further out
  const tint = (mask, rgb) => sharp({ create: { width: 1024, height: 1024, channels: 3, background: rgb } }).joinChannel(mask).png().toBuffer();
  return sharp(await tint(glow, { r: 255, g: 214, b: 120 })).composite([{ input: await tint(dilated, { r: 255, g: 214, b: 120 }) }]).png().toBuffer();
}

export async function renderArt(beeFile, traits, { mode = "slot", colour = INK } = {}) {
  const files = [
    join(LAYERS, "background", `${traits.background}.png`),
    join(LAYERS, "aura", `${traits.aura}.png`),
    beeFile,
    join(LAYERS, "badge", `${traits.badge}.png`),
  ];
  for (const f of files) if (!existsSync(f)) throw new Error(`missing layer ${f}`);
  const aura = traits.aura === "gold_outline" ? await goldOutline(beeFile) : files[1];
  return sharp(files[0])
    .composite([{ input: aura }, { input: beeFile }, { input: files[3] }, ...(await itemLayers(traits.item, mode, colour))])
    .png()
    .toBuffer();
}

export async function renderCard(card) {
  const traits = pickTraits(card);
  const isRank = card.collection === "rank";
  const rank = isRank ? T.ranks[card.tier] : null;
  const beeFile = isRank ? join(RANKS, card.tier, `${card.tier}_card.png`) : resolve(card.bee_file ?? join(RANKS, "sentinel", "sentinel_card.png"));
  const title = card.title ?? (isRank ? rank.title : card.tier);
  const colour = isRank ? rank.colour : card.colour ?? T.achievement_colour;

  const art = await renderArt(beeFile, traits, { mode: isRank ? "slot" : "bubble", colour });
  const { x, y, size } = T.canvas.art_window;
  const artScaled = await sharp(art).resize(size, size).png().toBuffer();

  const subtitle = isRank
    ? `RANK CARD · ${rank.points}${card.tier === "paragon" ? "+" : ""} POINT${rank.points === 1 ? "" : "S"}`
    : `ACHIEVEMENT${card.cap ? ` · CAP ${nf(card.cap, 0)}` : ""}`;
  const minted = `Minted ${card.minted_at}${card.season ? ` · ${card.season}` : ""}`;
  const svg = FRAME.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = {
      rank_colour: colour,
      title: esc(title),
      serial: `#${card.serial}`,
      subtitle: esc(subtitle),
      plastic: mass(card.impact?.plastic_g ?? 0),
      co2e: mass(card.impact?.co2e_g ?? 0),
      stamps: nf(card.impact?.stamps ?? 0, 0),
      unlocked_by: esc(card.unlocked_by ?? "EcoProof"),
      logo_href: esc(logoHref(card.logo)),
      minted_line: esc(minted),
    }[k];
    if (v === undefined) throw new Error(`frame slot {{${k}}} has no value`);
    return v;
  });

  const [W, H] = T.canvas.card;
  const png = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: artScaled, left: x, top: y }, { input: Buffer.from(svg) }])
    .png()
    .toBuffer();

  const metadata = {
    name: `EcoProof ${title} #${card.serial}`,
    symbol: "ECOPROOF",
    attributes: [
      { trait_type: "collection", value: card.collection },
      { trait_type: "tier", value: title },
      { trait_type: "serial", value: card.serial },
      { trait_type: "background", value: traits.background.replace(/_/g, "-") },
      { trait_type: "aura", value: traits.aura.replace(/_/g, " ") },
      { trait_type: "item", value: traits.item.replace(/_/g, " ") },
      { trait_type: "badge", value: traits.badge },
      { trait_type: "plastic_avoided_g", value: card.impact?.plastic_g ?? 0 },
      { trait_type: "co2e_avoided_g", value: card.impact?.co2e_g ?? 0 },
      { trait_type: "stamps", value: card.impact?.stamps ?? 0 },
      { trait_type: "unlocked_by", value: card.unlocked_by ?? "EcoProof" },
      { trait_type: "minted_at", value: card.minted_at },
      ...(isRank ? [] : [{ trait_type: "season", value: card.season ?? "" }, { trait_type: "cap", value: card.cap ?? "open" }]),
    ],
  };
  return { png, art, traits, metadata };
}

// ---- CLI ------------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [json, outStem] = process.argv.slice(2);
  if (!json || !outStem) {
    console.error("usage: node compose.mjs '<card json>' <out/stem>");
    process.exit(1);
  }
  const { png, art, metadata, traits } = await renderCard(JSON.parse(json));
  mkdirSync(dirname(resolve(outStem)), { recursive: true });
  writeFileSync(`${outStem}.png`, png);
  writeFileSync(`${outStem}_art.png`, art);
  writeFileSync(`${outStem}.json`, JSON.stringify(metadata, null, 2));
  console.log(outStem, traits);
}
