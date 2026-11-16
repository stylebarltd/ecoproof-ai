"use client";
import { useCallback, useEffect, useState } from "react";
import { preparePhoto } from "@/lib/clientPhoto";
import { MAX_PHOTO_BYTES } from "@/lib/photoRules";
import type { ProductSetupState } from "@/lib/productRules";

/** An eco shop's product setup, loaded from and saved to /api/places/mine/<id>/products. Every change answers with the whole setup. */
export function useProductSetup(placeId: string) {
  const api = `/api/places/mine/${placeId}/products`;
  const [d, setD] = useState<ProductSetupState | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "signin" | "none">("loading");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [report, setReport] = useState<{ added: number; kept: number; problems: string[] } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(api, { cache: "no-store" });
    if (r.ok) { setD(await r.json()); setState("ok"); } else setState(r.status === 401 ? "signin" : "none");
  }, [api]);
  useEffect(() => { const init = async () => { await load(); }; init(); }, [load]);

  /** Sends a change; true when it was saved. The error, if any, is in `err`. */
  const send = useCallback(async (path: string, init: RequestInit): Promise<boolean> => {
    setErr(""); setBusy(true);
    try {
      const r = await fetch(`${api}${path}`, init);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Something went wrong. Try again.");
      setD(j);
      if (j.report) setReport(j.report);
      return true;
    } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong"); return false; }
    finally { setBusy(false); }
  }, [api]);

  const json = (method: string, body: object): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  /** Shrinks a picked photo and sends it as the request body. */
  const photo = useCallback(async (path: string, file: File | undefined): Promise<boolean> => {
    if (!file) return false;
    let blob: Blob;
    try { blob = await preparePhoto(file, MAX_PHOTO_BYTES); } catch { setErr(`We couldn't read "${file.name}". Try a JPEG, PNG or WebP.`); return false; }
    return send(path, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
  }, [send]);

  return {
    d, state, busy, err, setErr, report,
    /** A prepared list as a .json file: { products: [...] } or the bare array (lib/products.ts importProducts). */
    importList: async (f?: File) => {
      if (!f) return false;
      let products: unknown;
      try { const j = JSON.parse(await f.text()); products = Array.isArray(j) ? j : j.products; } catch { setErr("That file isn't a product list (JSON)."); return false; }
      return send("/import", json("POST", { products }));
    },
    saveSetup: (b: { categories?: string[]; refill?: boolean; declared?: true }) => send("/setup", json("PUT", b)),
    addProduct: (b: { receiptName: string; category: string; packagingType: string; productType?: string; pieces?: number; replaces?: string; fromQueue?: boolean }) => send("", json("POST", b)),
    updateProduct: (id: string, b: { productType?: string; pieces?: number }) => send(`?product=${encodeURIComponent(id)}`, json("PATCH", b)),
    removeProduct: (id: string) => send(`?product=${encodeURIComponent(id)}`, { method: "DELETE" }),
    addAlias: (id: string, name: string) => send(`/${encodeURIComponent(id)}/aliases`, json("POST", { name })),
    removeAlias: (id: string, name: string) => send(`/${encodeURIComponent(id)}/aliases?name=${encodeURIComponent(name)}`, { method: "DELETE" }),
    setPart: (id: string, partId: string, count: number) => send(`/${encodeURIComponent(id)}/parts`, json("PUT", { partId, count })),
    /** The owner's decision on products the shop's plugin sent (lib/catalogue.ts). */
    decideCatalogue: (b: { packaging?: string; add?: { id: number; type: string; pieces: number }[]; skip?: number[] }) => send("/catalogue", json("POST", b)),
    dismiss: (rawText: string) => send("/queue", json("POST", { dismiss: rawText })),
    sample: (f?: File) => photo("/sample", f),
    productPhoto: (id: string, f?: File) => photo(`/${encodeURIComponent(id)}/photo`, f),
  };
}
