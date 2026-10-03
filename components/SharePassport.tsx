"use client";
import { useEffect, useRef, useState } from "react";
import { Copy, Download, Share2, X } from "lucide-react";

type Props = { passportId: string; stamps: number; tier: string | null };

const enc = encodeURIComponent;

/**
 * "Share my passport": a ready-to-post preview (image + caption + link) with one tap per network.
 * - Telegram, X, Facebook and WhatsApp open their own share screens with the caption and the passport link; the link unfurls into
 *   the share image (the passport page carries it as its link preview).
 * - "Share image…" opens the phone's share sheet with the PNG attached (Instagram, Stories, Messages, anything installed).
 *   The image is fetched when the sheet opens, because phones only allow sharing straight from a tap.
 */
export default function SharePassport({ passportId, stamps, tier }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [canFiles, setCanFiles] = useState(false);
  const [loadErr, setLoadErr] = useState(false);
  const [msg, setMsg] = useState("");
  const link = typeof window === "undefined" ? "" : `${location.origin}/u/${enc(passportId)}`;
  const defaultCaption = `I collected ${stamps} eco stamp${stamps === 1 ? "" : "s"}${tier ? ` and earned my Eco ${tier} NFT` : ""} with EcoProof 🌱🐝 Every stamp is verified on Solana. #EcoProof #PlasticFree #Solana`;
  const [caption, setCaption] = useState(defaultCaption);
  const started = useRef(false);

  useEffect(() => {
    if (!open || started.current) return;
    started.current = true;
    (async () => {
      try {
        const blob = await (await fetch(`/api/passport-card/${enc(passportId)}?format=square`)).blob();
        const f = new File([blob], "ecoproof-passport.png", { type: "image/png" });
        setFile(f); setPreview(URL.createObjectURL(blob));
        setCanFiles(!!navigator.canShare?.({ files: [f] }));
      } catch { setLoadErr(true); }
    })();
  }, [open, passportId]);

  const full = `${caption}\n${link}`;
  const go = (url: string) => window.open(url, "_blank", "noopener,noreferrer");
  const download = () => {
    if (!file) return;
    const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = file.name; a.click();
  };
  const copy = async (t: string, ok: string) => { try { await navigator.clipboard.writeText(t); setMsg(ok); } catch { setMsg("Couldn't copy. Select the text and copy it by hand."); } };

  // Called straight from the tap (no await before it), as iOS requires.
  const shareImage = () => {
    if (!file) return;
    navigator.share({ files: [file], text: full }).catch((e) => { if ((e as Error).name !== "AbortError") setMsg("Sharing the image isn't available here. Use Download, then post it."); });
  };
  const instagram = () => {
    if (canFiles) return shareImage();
    download();
    copy(full, "Image saved and caption copied. Open Instagram, pick the image and paste the caption.");
  };

  const chip = "flex flex-col items-center justify-center gap-1 rounded-2xl bg-white/70 px-2 py-3 text-[12px] font-bold text-ink ring-1 ring-white/80 active:scale-[0.98]";
  return (
    <>
      <button onClick={() => { setCaption(defaultCaption); setOpen(true); }} className="flex w-full items-center justify-center gap-2 rounded-full bg-honey-500 py-3 font-heading text-[15px] text-ink shadow-[0_6px_20px_rgba(232,163,23,0.45)] ring-1 ring-white/60">
        <Share2 size={17} strokeWidth={2.5} /> Share my passport
      </button>

      {open && (
        <div className="fixed inset-0 z-[4000] flex items-end bg-ink/50" onClick={() => setOpen(false)}>
          <div className="mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-neutral-100 p-4 pb-8 text-ink shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg">Share your passport</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full bg-white p-1.5"><X size={18} /></button>
            </div>

            <div className="overflow-hidden rounded-2xl ring-1 ring-sage-300">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Your passport image" className="w-full" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-sage-100 text-sm text-sage-800">{loadErr ? "Couldn't make the image. Try again." : "Making your image…"}</div>
              )}
            </div>

            <label className="mt-3 block text-xs font-semibold text-neutral-600">Your post (edit it if you like)
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} className="mt-1 w-full rounded-xl bg-white p-2.5 text-sm font-normal text-ink ring-1 ring-neutral-300" />
            </label>
            <p className="mt-1 break-all text-[11px] text-neutral-500">Link added to your post: {link}</p>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {canFiles && <button onClick={shareImage} className={`${chip} col-span-3 bg-honey-500 text-sm`}><span className="flex items-center gap-2 text-sm"><Share2 size={16} /> Share image… (Instagram, Stories, Messages)</span></button>}
              <button onClick={() => go(`https://t.me/share/url?url=${enc(link)}&text=${enc(caption)}`)} className={chip}><span className="text-lg">✈️</span>Telegram</button>
              <button onClick={() => go(`https://twitter.com/intent/tweet?text=${enc(caption)}&url=${enc(link)}`)} className={chip}><span className="text-lg font-black">𝕏</span>X</button>
              <button onClick={() => go(`https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`)} className={chip}><span className="text-lg font-black text-[#1877f2]">f</span>Facebook</button>
              <button onClick={() => go(`https://wa.me/?text=${enc(full)}`)} className={chip}><span className="text-lg">💬</span>WhatsApp</button>
              <button onClick={instagram} disabled={!file} className={`${chip} disabled:opacity-50`}><span className="text-lg">📷</span>Instagram</button>
              <button onClick={() => copy(full, "Post copied. Paste it anywhere.")} className={chip}><Copy size={18} />Copy post</button>
              <button onClick={download} disabled={!file} className={`${chip} col-span-3 disabled:opacity-50`}><span className="flex items-center gap-2"><Download size={16} /> Save image</span></button>
            </div>
            <p className="mt-2 text-center text-[11px] text-neutral-500">Telegram, X, Facebook and WhatsApp show your image as a link preview. For Instagram the image is attached.</p>
            {msg && <p className="mt-2 rounded-xl bg-sage-100 p-2 text-center text-xs text-sage-900">{msg}</p>}
          </div>
        </div>
      )}
    </>
  );
}
