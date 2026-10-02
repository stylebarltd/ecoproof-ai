"use client";
import { useState } from "react";

export default function ShareButtons({ id, co2, plastics }: { id: string; co2: number; plastics: number }) {
  const [msg, setMsg] = useState("");
  const url = () => `${location.origin}/p/${id}`;
  const text = `I just avoided ${plastics} single-use plastics and saved ${co2} kg CO₂, verified on Solana with EcoProof AI 🌱`;

  async function cardFile(format: "wide" | "square") {
    const blob = await (await fetch(`/api/card/${id}${format === "square" ? "?format=square" : ""}`)).blob();
    return new File([blob], `ecoproof-${format}.png`, { type: "image/png" });
  }

  async function share() {
    try {
      const file = await cardFile("square");
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${text}\n${url()}` });
      } else if (navigator.share) {
        await navigator.share({ text, url: url() });
      } else {
        await navigator.clipboard.writeText(`${text} ${url()}`);
        setMsg("Link copied. Paste it into your post.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setMsg("Sharing isn't available here. Try Download image.");
    }
  }

  async function download() {
    const file = await cardFile("square");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    setMsg("Image saved. Attach it to your Instagram post or story.");
  }

  async function copy() {
    await navigator.clipboard.writeText(url());
    setMsg("Link copied");
  }

  const btn = "rounded-xl bg-emerald-800 py-3 text-center text-sm font-medium";
  return (
    <div className="space-y-2 rounded-2xl bg-emerald-900/60 p-4">
      <button onClick={share} className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-emerald-950">📲 Share my impact</button>
      <div className="grid grid-cols-2 gap-2">
        <a className={btn} target="_blank" rel="noreferrer"
           onClick={(e) => { e.currentTarget.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url())}`; }}
           href="https://twitter.com/intent/tweet">𝕏 Post</a>
        <a className={btn} target="_blank" rel="noreferrer"
           onClick={(e) => { e.currentTarget.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url())}`; }}
           href="https://www.linkedin.com/sharing/share-offsite/">in LinkedIn</a>
        <button onClick={download} className={btn}>⬇️ Download image</button>
        <button onClick={copy} className={btn}>🔗 Copy link</button>
      </div>
      {msg && <p className="text-center text-xs text-emerald-300">{msg}</p>}
    </div>
  );
}
