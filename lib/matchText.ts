// Comparing a receipt line with a product's receipt name, as text only (no database: lib/match.ts does that). Receipts print the same
// product with different case, sizes and counts ("BEESWAX WRAP 3PK 250G" / "Beeswax wrap"), so those are taken out before comparing.

/** A fuzzy match counts only above this. */
export const FUZZY_MIN = 0.8;

// Sizes and counts: "250g", "1.5 l", "3 pcs", "x2", and the Thai units for gram, kilogram, millilitre, litre, piece and baht.
const UNITS = "kg|g|mg|ml|cl|l|oz|lb|pcs|pc|pk|pack|packs|x|ก|กก|กรัม|มล|ล|ลิตร|ชิ้น|บาท";
const SIZE = new RegExp(`(?<![a-z฀-๿])(?:${UNITS})?\\s*\\d+(?:[.,]\\d+)?\\s*(?:${UNITS})?(?![a-z฀-๿])`, "g");

/** How a name is compared exactly: case and spacing don't count, everything else does. */
export const exactKey = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

/** The words of a name: lower case, without numbers, units and punctuation. Thai has no spaces, so a Thai name is one or two long words. */
export function tokens(s: string): string[] {
  const words = s.normalize("NFKC").toLowerCase().replace(SIZE, " ").replace(/[^a-z฀-๿]+/g, " ").trim();
  return words ? [...new Set(words.split(" "))] : [];
}

/** 0 to 1: how many words two names share (Dice: twice the shared words over all words). 1 when the words are the same set. */
export function similarity(a: string, b: string): number {
  const ta = tokens(a), tb = new Set(tokens(b));
  if (!ta.length || !tb.size) return 0;
  const shared = ta.filter((w) => tb.has(w)).length;
  return (2 * shared) / (ta.length + tb.size);
}

export type Named = { productId: string; name: string };

/** The product whose name (or alias) is closest to the line, when it is above FUZZY_MIN and no other product is as close. */
export function bestFuzzy(rawText: string, names: Named[]): { productId: string; confidence: number } | null {
  const best = new Map<string, number>();
  for (const n of names) best.set(n.productId, Math.max(best.get(n.productId) ?? 0, similarity(rawText, n.name)));
  const ranked = [...best].sort((x, y) => y[1] - x[1]);
  if (!ranked.length || ranked[0][1] <= FUZZY_MIN) return null;
  if (ranked[1] && ranked[1][1] === ranked[0][1]) return null; // two products fit equally well: leave it to the owner
  return { productId: ranked[0][0], confidence: Math.round(ranked[0][1] * 100) / 100 };
}
