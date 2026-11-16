"use client";
import { useCallback, useEffect, useState } from "react";
import { ImagePlus, Images, Loader2, X } from "lucide-react";
import { preparePhoto } from "@/lib/clientPhoto";
import { isShop } from "@/lib/placeKinds";
import { MAX_PHOTO_BYTES, type PlacePhoto } from "@/lib/photoRules";

type Data = { role: "owner" | "staff"; max: number; photos: PlacePhoto[] };

/** The shop dashboard's photos: up to three, the first is the cover on the map and in the shop list. Only the owner changes them. */
export default function PhotosPanel({ placeId, kind, online }: { placeId: string; kind: string; online: boolean }) {
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const api = `/api/places/mine/${placeId}/photos`;

  const load = useCallback(async () => {
    const r = await fetch(api, { cache: "no-store" });
    if (r.ok) setD(await r.json());
  }, [api]);
  useEffect(() => { const init = async () => { await load(); }; init(); }, [load]);

  /** Sends a change and shows the list the server answers with. */
  async function send(url: string, init: RequestInit) {
    const r = await fetch(url, init);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Something went wrong. Try again.");
    setD(j);
  }
  async function add(files: FileList | null) {
    if (!files?.length || !d) return;
    const room = d.max - d.photos.length;
    setErr(""); setBusy(true);
    try {
      for (const f of [...files].slice(0, room)) {
        let blob: Blob;
        try { blob = await preparePhoto(f, MAX_PHOTO_BYTES); }
        catch { throw new Error(`We couldn't read "${f.name}". Try a JPEG, PNG or WebP.`); }
        await send(api, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
      }
      if (files.length > room) setErr(`Only ${room} more photo${room === 1 ? "" : "s"} fitted: a place can have ${d.max}.`);
    } catch (e) { setErr(e instanceof Error ? e.message : "Couldn't add the photo"); }
    finally { setBusy(false); }
  }
  const change = (url: string, init: RequestInit) => async () => {
    setErr(""); setBusy(true);
    try { await send(url, init); } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong"); } finally { setBusy(false); }
  };

  const owner = d?.role === "owner";
  const what = isShop(kind)
    ? online ? "Show what you sell: product photos, your shelves, or screenshots of your online shop." : "Show what you sell: your products and your shop."
    : "Show your place and what you serve or offer.";
  return (
    <section className="glass rounded-[28px] p-4 lg:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-[17px] leading-tight">Photos</h2>
        {d ? <span className="text-xs tabular-nums text-sage-900">{d.photos.length} of {d.max}</span> : <Images size={18} strokeWidth={2.4} className="text-sage-700" />}
      </div>
      {!d ? <Loader2 size={18} className="animate-spin text-sage-700" /> : (
        <>
          <p className="text-[12.5px] leading-snug text-sage-900">{what} Visitors see them on your page; the first one is your cover on the map{isShop(kind) ? " and in the shop list" : ""}.</p>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {d.photos.map((p, i) => (
              <li key={p.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- served by our own route, already sized */}
                <img src={p.url} alt={`Photo ${i + 1}`} className="aspect-square w-full rounded-2xl object-cover ring-1 ring-white/70" />
                {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-honey-500 px-2 py-0.5 text-[10.5px] font-bold text-ink">Cover</span>}
                {owner && (
                  <button type="button" disabled={busy} onClick={change(`${api}?photo=${encodeURIComponent(p.id)}`, { method: "DELETE" })} aria-label={`Remove photo ${i + 1}`}
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/75 text-cream disabled:opacity-50"><X size={15} strokeWidth={2.8} /></button>
                )}
                {owner && i > 0 && (
                  <button type="button" disabled={busy} onClick={change(api, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cover: p.id }) })}
                    className="absolute inset-x-1.5 bottom-1.5 rounded-full bg-white/90 py-1 text-[11px] font-bold text-ink disabled:opacity-50">Make cover</button>
                )}
              </li>
            ))}
            {owner && d.photos.length < d.max && (
              <li>
                <label className={`flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-sage-500/60 bg-white/50 text-center text-[12px] font-bold text-sage-900 ${busy ? "pointer-events-none opacity-60" : ""}`}>
                  {busy ? <Loader2 size={22} className="animate-spin" /> : <ImagePlus size={22} strokeWidth={2.4} />}
                  {busy ? "Adding…" : "Add photos"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy} className="sr-only" onChange={(e) => { const f = e.target.files; add(f).finally(() => { e.target.value = ""; }); }} />
                </label>
              </li>
            )}
          </ul>
          {!owner && <p className="mt-3 text-xs text-sage-900">{d.photos.length ? "Only the owner can change the photos." : "No photos yet. Only the owner can add them."}</p>}
          {err && <p className="mt-2 rounded-xl bg-terra-100 p-2.5 text-sm text-terra-800">{err}</p>}
        </>
      )}
    </section>
  );
}
