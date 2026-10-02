import Anthropic from "@anthropic-ai/sdk";
import { TIERS } from "./nft";

export type NftStats = { milestone: number; plasticItems: number; co2Kg: number; brand: string; proofs: number };

const MODEL = process.env.NFT_ART_MODEL ?? "claude-sonnet-5-5";

/** Strip anything that could run code or load remote content from model-written SVG. */
export function sanitizeSvg(svg: string): string | null {
  const m = svg.match(/<svg[\s\S]*<\/svg>/i);
  if (!m) return null;
  let s = m[0];
  if (/<\s*(script|foreignObject|iframe|image|use)\b/i.test(s) || /\son\w+\s*=/i.test(s) || /(javascript:|https?:|data:)/i.test(s.replace(/xmlns(:\w+)?="[^"]*"/g, ""))) return null;
  if (!/viewBox/i.test(s)) s = s.replace(/<svg/i, '<svg viewBox="0 0 512 512"');
  return s.length < 20_000 ? s : null;
}

/** Deterministic fallback so a mint never blocks on the AI. */
export function fallbackSvg(st: NftStats): string {
  const t = TIERS[st.milestone]?.name ?? "Warrior";
  const leaves = Math.min(4, 1 + Math.floor(Math.log10(Math.max(1, st.milestone)) * 1.5));
  const leaf = (i: number) => `<path transform="translate(${256 + (i - (leaves - 1) / 2) * 70 - 24} 96) rotate(${(i - (leaves - 1) / 2) * 18} 24 24)" d="M24 6C14 6 8 14 8 24c0 9 6 16 16 16 8 0 14-6 14-14 0-12-8-20-14-20z" fill="#8fa073" stroke="#56633f" stroke-width="3"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#272e1b"/><stop offset="1" stop-color="#8fa073"/></linearGradient></defs><rect width="512" height="512" fill="url(#g)"/>${Array.from({ length: leaves }, (_, i) => leaf(i)).join("")}<circle cx="256" cy="270" r="92" fill="#f5ead8"/><circle cx="224" cy="258" r="9" fill="#201e1d"/><circle cx="288" cy="258" r="9" fill="#201e1d"/><path d="M222 296q34 28 68 0" fill="none" stroke="#201e1d" stroke-width="7" stroke-linecap="round"/><text x="256" y="420" text-anchor="middle" font-family="sans-serif" font-size="40" font-weight="700" fill="#f5ead8">Eco ${t}</text><text x="256" y="462" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#ccdbb2">${st.plasticItems} plastics avoided</text></svg>`;
}

/** AI-generated "eco warrior" artwork (SVG) for a milestone. Falls back to the template if the model is unavailable or unsafe. */
export async function generateArt(st: NftStats): Promise<{ svg: string; ai: boolean }> {
  if (!process.env.ANTHROPIC_API_KEY) return { svg: fallbackSvg(st), ai: false };
  const tier = TIERS[st.milestone];
  try {
    const res = await new Anthropic().messages.create({
      model: MODEL,
      max_tokens: 6000,
      messages: [{
        role: "user",
        content: `Design a collectible NFT avatar: a friendly "eco warrior" character, tier "${tier?.name}" (${st.milestone === 1 ? "just starting out: small, a seedling companion" : st.milestone === 10 ? "growing: leafy armour, a reusable bottle" : st.milestone === 50 ? "experienced guardian: bamboo staff, beeswax-wrap cape" : "legendary: crown of leaves, glowing aura, forest creatures"}). It stands for someone who avoided ${st.plasticItems} single-use plastics via ${st.brand}.
Output ONLY one self-contained SVG: viewBox="0 0 512 512", flat organic style, palette sage #8fa073 / dark green #272e1b / cream #f5ead8 / terracotta #8c491a. Include the text "${tier?.name} · ${st.plasticItems} plastics avoided" at the bottom. No scripts, no external references, no images, no animation, under 12 KB.`,
      }],
    });
    const text = res.content.map((b) => ("text" in b ? b.text : "")).join("");
    const svg = sanitizeSvg(text);
    if (svg) return { svg, ai: true };
  } catch (e) { console.error("nft art failed", e); }
  return { svg: fallbackSvg(st), ai: false };
}
