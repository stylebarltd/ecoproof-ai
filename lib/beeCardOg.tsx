import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RankKey, Tier } from "./milestoneRules";

// The Bee Guardian rank card for share images (next/og), drawn like the NFT card set (art/v2/layers/frame/frame.svg): a paper card with a
// rank-coloured rim, the cel-shaded artwork in a window, the name plate, the impact row and the footer. Caprasimo (display) and Figtree (text)
// ship in public/share/fonts (OFL); the artwork per rank in public/share/art (640px, from art/v2/compositor/samples).

export const CARD_INK = "#3A2A1C", CARD_PAPER = "#FBF5EA", CARD_MUTED = "#6B5843", CARD_RULE = "#D8CBB6";
export const RANK_COLOUR: Record<RankKey, string> = { sentinel: "#A9825A", warden: "#B4703C", guardian: "#6F6B66", vanguard: "#B98535", paragon: "#D9A63A" };

const pub = (p: string) => readFile(join(process.cwd(), "public", p));

/** The rank's artwork as a data URI, read from public/ on disk (next.config.ts traces it into the share routes). Null if missing. */
export async function rankArt(key: RankKey): Promise<string | null> {
  const png = await pub(`share/art/${key}.png`).catch(() => null);
  return png ? `data:image/png;base64,${png.toString("base64")}` : null;
}

/** The card fonts for ImageResponse: Caprasimo, Figtree regular and bold (static instances of the variable font; the renderer cannot read
 *  variable fonts). */
export async function cardFonts() {
  const [caprasimo, figtree, figtreeBold] = await Promise.all([pub("share/fonts/Caprasimo-Regular.ttf"), pub("share/fonts/Figtree-Regular.ttf"), pub("share/fonts/Figtree-Bold.ttf")]);
  return [
    { name: "Caprasimo", data: caprasimo, weight: 400 as const, style: "normal" as const },
    { name: "Figtree", data: figtree, weight: 400 as const, style: "normal" as const },
    { name: "Figtree", data: figtreeBold, weight: 700 as const, style: "normal" as const },
  ];
}

const nf = (n: number, d = 0) => n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });

type Props = {
  rank: Tier;
  art: string | null;
  /** Card width in px; the height follows the NFT card's 1024x1434. */
  size: number;
  serial?: number;
  edition?: number;
  locked?: boolean;
  /** Whether the Bee Guardian is on Solana already (else it is earned and waiting for its mint). */
  minted?: boolean;
  /** The owner's totals, drawn in the impact row. */
  impact: { plasticItems: number; co2Kg: number; stamps: number };
};

export function BeeCardOg({ rank, art, size, serial, edition, locked, minted, impact }: Props) {
  const k = size / 1024;
  const colour = locked ? CARD_RULE : RANK_COLOUR[rank.key];
  const serialText = serial ? `${rank.key === "paragon" && edition ? `Ed. ${edition} · ` : ""}#${serial}` : "";
  const subtitle = `RANK CARD · ${rank.at}${rank.key === "paragon" ? "+" : ""} POINT${rank.at === 1 ? "" : "S"}`;
  const stat = (value: string, label: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
      <div style={{ display: "flex", fontWeight: 700, fontSize: 46 * k, color: CARD_INK, lineHeight: 1 }}>{value}</div>
      <div style={{ display: "flex", fontSize: 23 * k, color: CARD_MUTED, marginTop: 8 * k }}>{label}</div>
    </div>
  );
  const rule = (w: number, c: string) => <div style={{ display: "flex", height: w * k, background: c, borderRadius: 999 }} />;
  return (
    <div style={{ display: "flex", width: size, height: 1434 * k, padding: 16 * k, borderRadius: 40 * k, background: colour, boxShadow: `0 ${18 * k}px ${40 * k}px rgba(58,42,28,0.28)` }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 20 * k, borderRadius: 32 * k, border: `${4 * k}px solid ${CARD_INK}`, background: CARD_PAPER, color: CARD_INK, fontFamily: "Figtree" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 952 * k, height: 952 * k, borderRadius: 28 * k, border: `${6 * k}px solid ${CARD_INK}`, background: "#E9E2D4", overflow: "hidden" }}>
          {art ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={art} width={940 * k} height={940 * k} alt="" style={{ opacity: locked ? 0.3 : 1 }} />
          ) : (
            <div style={{ display: "flex", fontFamily: "Caprasimo", fontSize: 90 * k, color: colour }}>{rank.name}</div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 44 * k }}>
          <div style={{ display: "flex", fontFamily: "Caprasimo", fontSize: 86 * k, lineHeight: 1 }}>{rank.name}</div>
          <div style={{ display: "flex", fontWeight: 700, fontSize: 58 * k, lineHeight: 1, color: colour }}>{serialText}</div>
        </div>
        <div style={{ display: "flex", fontWeight: 700, fontSize: 25 * k, letterSpacing: 3 * k, color: CARD_MUTED, marginTop: 16 * k }}>{subtitle}</div>
        <div style={{ display: "flex", marginTop: 20 * k }}>{rule(3, CARD_INK)}</div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 26 * k }}>
          {stat(nf(impact.plasticItems), "plastic items avoided")}
          <div style={{ display: "flex", width: 2 * k, height: 76 * k, background: CARD_RULE }} />
          {stat(`${nf(impact.co2Kg, impact.co2Kg >= 100 ? 0 : 1)} kg`, "CO₂e avoided")}
          <div style={{ display: "flex", width: 2 * k, height: 76 * k, background: CARD_RULE }} />
          {stat(nf(impact.stamps), impact.stamps === 1 ? "stamp" : "stamps")}
        </div>
        <div style={{ display: "flex", marginTop: 30 * k }}>{rule(2, CARD_RULE)}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontWeight: 700, fontSize: 30 * k, color: CARD_INK }}>{locked ? `Unlocks at ${rank.at} point${rank.at === 1 ? "" : "s"}` : "Soulbound Bee Guardian"}</div>
            <div style={{ display: "flex", fontSize: 23 * k, color: CARD_MUTED, marginTop: 6 * k }}>{locked ? "Collect stamps to earn it" : minted ? "Minted on Solana" : "Earned · minting on Solana"}</div>
          </div>
          <div style={{ display: "flex", fontFamily: "Caprasimo", fontSize: 34 * k, color: colour }}>EcoProof</div>
        </div>
      </div>
    </div>
  );
}
