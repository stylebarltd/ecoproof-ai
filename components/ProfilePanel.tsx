"use client";
import { useState } from "react";
import { Check, ImagePlus, Loader2 } from "lucide-react";
import type { MyPlace } from "@/components/ShopTools";
import { prepareLogo } from "@/lib/clientLogo";
import { TAGLINE_MAX } from "@/lib/placeLogo";

/** The owner's logo and tagline, the two things given when joining: shown on the place's page, the map, the shop list and the postcard.
 *  A new logo is saved as soon as it is picked; the tagline with its Save button. */
export default function ProfilePanel({ place, onSaved }: { place: MyPlace; onSaved: () => void | Promise<void> }) {
  const [tagline, setTagline] = useState(place.tagline ?? "");
  const [busy, setBusy] = useState<"logo" | "tagline" | null>(null);
  const [done, setDone] = useState("");
  const [err, setErr] = useState("");

  async function save(what: "logo" | "tagline", body: object, message: string) {
    setErr(""); setDone(""); setBusy(what);
    try {
      const r = await fetch(`/api/places/mine/${place.id}/profile`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Something went wrong. Try again.");
      await onSaved();
      setDone(message);
    } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(null); }
  }
  async function pickLogo(f?: File) {
    if (!f) return;
    let logo: string;
    try { logo = await prepareLogo(f); } catch { setErr("We couldn't read that image. Try a PNG or JPEG."); return; }
    await save("logo", { logo }, "Logo saved.");
  }
  const changed = tagline.trim().replace(/\s+/g, " ") !== (place.tagline ?? "");
  const pill = "rounded-full px-3.5 py-2 text-xs font-bold disabled:opacity-50";

  return (
    <section className="glass rounded-[28px] p-4 lg:p-5">
      <h2 className="text-[17px] leading-tight">Logo and tagline</h2>
      <p className="mt-0.5 text-[12.5px] leading-snug text-sage-900">What visitors see of you on your page, the map and your postcard.</p>

      <div className="mt-3 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={place.imageUrl} alt="Your badge" width={72} height={72} className="h-[72px] w-[72px] shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <label className={`${pill} flex cursor-pointer items-center gap-1.5 bg-sage-500 text-cream ${busy ? "pointer-events-none opacity-50" : ""}`}>
              {busy === "logo" ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} strokeWidth={2.5} />}
              {place.hasLogo ? "Change logo" : "Add your logo"}
              <input type="file" accept="image/png,image/jpeg,image/webp" disabled={!!busy} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; pickLogo(f).finally(() => { e.target.value = ""; }); }} />
            </label>
            {place.hasLogo && <button type="button" disabled={!!busy} onClick={() => save("logo", { logo: null }, "Logo removed.")} className={`${pill} glass`}>Remove</button>}
          </div>
          <p className="mt-1.5 text-[11.5px] leading-snug text-sage-900">PNG, JPEG or WebP. A square logo fits best: we crop to the middle.</p>
        </div>
      </div>

      <label className="mt-4 block text-[13px] font-bold" htmlFor="place-tagline">Tagline</label>
      <input id="place-tagline" value={tagline} maxLength={TAGLINE_MAX} disabled={!!busy} onChange={(e) => { setTagline(e.target.value); setDone(""); }}
        placeholder="One line about your place" className="mt-1 w-full rounded-xl bg-white/80 px-3 py-2.5 text-sm ring-1 ring-sage-900/15" />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11.5px] tabular-nums text-sage-900">{tagline.length} of {TAGLINE_MAX}</span>
        <button type="button" disabled={!changed || !!busy} onClick={() => save("tagline", { tagline }, "Tagline saved.")} className={`${pill} flex items-center gap-1.5 bg-honey-500 text-ink`}>
          {busy === "tagline" && <Loader2 size={14} className="animate-spin" />} Save tagline
        </button>
      </div>
      {done && <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-bold text-sage-800" role="status"><Check size={14} strokeWidth={3} /> {done}</p>}
      {err && <p className="mt-2 rounded-xl bg-terra-100 p-2.5 text-sm text-terra-800" role="alert">{err}</p>}
    </section>
  );
}
