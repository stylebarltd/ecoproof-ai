import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { rankImage, rankSharePng, type RankKey, type Tier } from "./milestoneRules";

// The Bee Guardian collectible card for share images (next/og), drawn to match components/BeeCard.tsx.

/**
 * The rank's artwork as a data URI, read from public/ on disk (next.config.ts traces the files into the share-image routes),
 * so a share image never depends on the server fetching its own URL. Tries the 512px PNG first, then the full one
 * (WebP is not an option: the og renderer cannot decode it). Null if neither exists: the card then shows the rank name instead.
 */
export async function rankArt(key: RankKey): Promise<string | null> {
  for (const path of [rankSharePng(key), rankImage(key)]) {
    const png = await readFile(join(process.cwd(), "public", path)).catch(() => null);
    if (png) return `data:image/png;base64,${png.toString("base64")}`;
  }
  return null;
}

/** `impact`: the owner's verified-purchase totals, drawn under the rank once there are any. */
export function BeeCardOg({ rank, art, size, serial, edition, locked, impact }: { rank: Tier; art: string | null; size: number; serial?: number; edition?: number; locked?: boolean; impact?: { plasticItems: number; co2Kg: number } }) {
  const proven = !locked && impact ? [impact.plasticItems > 0 && `${impact.plasticItems} plastic${impact.plasticItems === 1 ? "" : "s"} avoided`, impact.co2Kg > 0 && `${impact.co2Kg.toFixed(1)} kg CO₂ saved`].filter(Boolean).join(" · ") : "";
  const k = size / 360;
  const label = serial ? `${rank.key === "paragon" && edition ? `Ed. ${edition} · ` : ""}#${String(serial).padStart(4, "0")}` : "";
  return (
    <div style={{ display: "flex", padding: 4 * k, borderRadius: 30 * k, background: "linear-gradient(135deg,#f7d27a,#a86f00 22%,#f0b93e 38%,#9be7d8 50%,#c9a0ff 58%,#f0b93e 70%,#7a5200 86%,#f7d27a)", boxShadow: "0 16px 40px rgba(0,0,0,0.35)" }}>
      <div style={{ display: "flex", flexDirection: "column", width: size, padding: 16 * k, borderRadius: 26 * k, color: "#f6f1e4", background: "radial-gradient(circle at 50% 40%, rgba(247,210,122,0.30), rgba(247,210,122,0) 62%), linear-gradient(160deg,#1d2416,#2c361f 55%,#14180e)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18 * k, fontWeight: 800, color: "#f7d27a", letterSpacing: 1 }}>
          <div style={{ display: "flex" }}>{`TIER ${rank.tier}`}</div>
          <div style={{ display: "flex", color: "#dcebc4" }}>{label}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: size - 32 * k, height: size - 32 * k }}>
          {art ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={art} width={size - 40 * k} height={size - 40 * k} alt="" style={{ opacity: locked ? 0.3 : 1 }} />
          ) : (
            <div style={{ display: "flex", fontSize: 54 * k, fontWeight: 800, color: "#f7d27a" }}>{rank.name}</div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "center", fontSize: 34 * k, fontWeight: 800 }}>{rank.name}</div>
        {proven ? <div style={{ display: "flex", justifyContent: "center", margin: `${4 * k}px 0`, fontSize: 17 * k, fontWeight: 700, color: "#dcebc4" }}>{proven}</div> : null}
        <div style={{ display: "flex", justifyContent: "center", fontSize: 17 * k, fontWeight: 700, color: "#f7d27a" }}>{locked ? `Unlocks at ${rank.at} point${rank.at === 1 ? "" : "s"}` : "Soulbound Bee Guardian · on Solana"}</div>
      </div>
    </div>
  );
}
