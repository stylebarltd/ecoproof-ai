"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicPlace } from "@/lib/stampPlaces";
import type { PlaceStars } from "@/lib/placePractices";
import type { ShopImpactData } from "@/components/ShopImpact";

// The ways a place gives out stamps: its counter QR, printed cards for parcels, and the WooCommerce connection.
// Used on /join (right after setting up a place) and in the shop dashboard (/shop/[id]).

export function CardsButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function go() {
    setBusy(true); setMsg("");
    const r = await fetch(`/api/places/mine/${id}/cards`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: 20 }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) window.open(j.printUrl, "_blank"); else setMsg(j.error || "Could not make cards");
  }
  return (
    <div>
      <button onClick={go} disabled={busy} className="w-full rounded-full bg-honey-500 py-2.5 text-sm font-semibold text-ink disabled:opacity-60">{busy ? "Making cards…" : "Make 20 printable cards for your parcels"}</button>
      {msg && <p className="mt-1 text-xs text-terra-800">{msg}</p>}
    </div>
  );
}

/** A copy link that says so: "Copied ✓" for a moment right where it was clicked, instead of a note somewhere else. */
export function CopyButton({ text, label = "copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");
  useEffect(() => { if (state === "idle") return; const t = setTimeout(() => setState("idle"), 1800); return () => clearTimeout(t); }, [state]);
  const go = () => navigator.clipboard?.writeText(text).then(() => setState("done"), () => setState("fail")) ?? setState("fail");
  return (
    <button type="button" onClick={go} aria-live="polite" className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-neutral-300 transition-colors ${state === "done" ? "bg-sage-500 text-cream ring-sage-500" : state === "fail" ? "bg-terra-100 text-terra-800 ring-terra-800/30" : "bg-white hover:bg-neutral-100"} ${className}`}>
      {state === "done" ? "Copied ✓" : state === "fail" ? "Select and copy by hand" : label}
    </button>
  );
}

export type MyPlace = PublicPlace & { status?: string; statusNote?: string | null; role?: "owner" | "staff"; stars?: PlaceStars | null; impact?: ShopImpactData | null };
type WooSetup = { plugin: { download: string; placeId: string; secret: string }; webhook: { deliveryUrl: string; secret: string; topic: string }; themeSnippet: string; themeSnippetOwnEmail: string };

/** `open` loads the setup steps straight away (the dashboard's "Set up the plugin" card lands here). The plugin already
 *  knows the app's URL, so only place id and secret are shown. */
export function WooOption({ id, open = false }: { id: string; open?: boolean }) {
  const [setup, setSetup] = useState<WooSetup | null>(null);
  const [msg, setMsg] = useState("");
  const load = () => fetch(`/api/places/mine/${id}/woo`).then(async (r) => {
    const j = await r.json().catch(() => ({}));
    if (r.ok) setSetup(j); else setMsg(j.error || "Could not load the setup");
  });
  useEffect(() => { if (open && !setup) void load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const field = (label: string, value: string, secret = false) => (
    <span className="mt-1 flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 ring-1 ring-neutral-300">
      <span className="shrink-0 text-neutral-600">{label}</span>
      <code className="min-w-0 flex-1 truncate select-all">{value}</code>
      <CopyButton text={value} />
      {secret && <span className="sr-only">(keep it private)</span>}
    </span>
  );
  return (
    <div id="woo-setup" className="space-y-2 rounded-2xl bg-sage-100 p-3 text-left text-sm">
      <p className="font-semibold">A. QR in your order email <span className="font-normal text-neutral-600">(WooCommerce shops)</span></p>
      <p className="text-xs text-neutral-600">Install the free EcoProof AI plugin. When an order is paid, your customer gets a personal button and QR in their order email. It&apos;s signed per order, so their stamp is a verified purchase with the real impact of what they bought.</p>
      {!setup ? (
        <button onClick={load} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold ring-1 ring-neutral-300">Show setup steps</button>
      ) : (
        <>
          <ol className="list-decimal space-y-2.5 pl-4 text-xs">
            <li><a href={setup.plugin.download} download className="inline-block rounded-full bg-honey-500 px-3 py-1.5 font-bold text-ink">Download the plugin</a></li>
            <li>In WordPress: <b>Plugins → Add New → Upload Plugin</b>, choose the file, <b>Install</b>, then <b>Activate</b>.</li>
            <li>Open <b>WooCommerce → Settings → EcoProof AI</b> and fill in:
              {field("Place id", setup.plugin.placeId)}
              {field("Secret", setup.plugin.secret, true)}
              <span className="mt-1 block text-neutral-600">Keep the secret private: it signs every order and every claim link.</span>
            </li>
            <li>Click <b>Save changes</b>, then <b>Test connection</b>. It should say &ldquo;EcoProof AI is connected&rdquo;.</li>
          </ol>
          <p className="text-xs text-neutral-600">That&apos;s it. The stamp appears in WooCommerce&apos;s <b>Processing order</b> email (sent when an order is paid). Using <b>FunnelKit</b>? It shows below the Order Summary block automatically. Other email builders: add the <code>[ecoproof_stamp]</code> shortcode, or switch on the separate stamp email in the plugin settings.</p>
          <details className="text-xs text-neutral-600">
            <summary className="cursor-pointer font-semibold">Can&apos;t install plugins? Set it up by hand</summary>
            <ol className="mt-2 list-decimal space-y-2 pl-4">
              <li>In WooCommerce: <b>Settings → Advanced → Webhooks → Add webhook</b>. Name EcoProof AI, Status Active, Topic <b>{setup.webhook.topic}</b>, API version WP REST API v3.</li>
              <li>Delivery URL: <code className="break-all">{setup.webhook.deliveryUrl}</code> <CopyButton text={setup.webhook.deliveryUrl} /></li>
              <li>Secret: the one above.</li>
              <li>Paste this into your <b>child theme&apos;s functions.php</b>: <CopyButton text={setup.themeSnippet} label="copy snippet" />
                <textarea readOnly value={setup.themeSnippet} rows={5} className="mt-1 w-full rounded-lg bg-white p-2 font-mono text-[10px] ring-1 ring-neutral-300" /></li>
              <li>If your order emails come from another plugin and the QR doesn&apos;t show up, use this snippet instead: it sends its own short email. <CopyButton text={setup.themeSnippetOwnEmail} label="copy snippet B" /></li>
            </ol>
            <p className="mt-2">This way only reacts to <b>completed</b> orders. The plugin also handles paid (processing) orders, refunds and retries.</p>
          </details>
        </>
      )}
      {msg && <p className="text-xs text-sage-800">{msg}</p>}
    </div>
  );
}

/** A place's ways to give stamps, per channel: the counter QR in store, and the order email and parcel cards online. Staff see
 *  everything except the WooCommerce setup, which holds the shop's secret. */
export function PlaceCard({ p, openWoo = false }: { p: MyPlace; openWoo?: boolean }) {
  const notice = p.status && p.status !== "active" ? <p className="rounded-xl bg-terra-100 p-2.5 text-xs text-terra-800">{p.status === "suspended" ? "This place was removed from EcoProof AI." : "This place is paused while we review reports."} {p.statusNote}</p> : null;
  return (
    <div className="space-y-3 rounded-[28px] bg-white p-4 text-center ring-1 ring-sage-300">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.imageUrl} alt="" width={96} height={96} className="mx-auto" />
      <h3 className="text-lg">{p.name}</h3>
      {notice}
      {p.inStore && (
        <>
          {p.online && <p className="text-left text-sm font-semibold">In your shop</p>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.qrUrl} alt={`QR code to collect a ${p.name} stamp`} width={180} height={180} className="mx-auto" />
          <p className="hidden text-xs text-neutral-500 lg:block">Try it: scan this QR with your phone&apos;s camera to see what customers see.</p>
          <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
            <Link href={`/place/${p.id}`} className="rounded-full bg-honey-500 py-2.5 text-ink">Print counter card</Link>
            <Link href={`/c/${p.id}`} className="rounded-full border-[1.5px] border-neutral-300 py-2.5">Preview stamp page</Link>
          </div>
        </>
      )}
      {p.online && (
        <>
          {p.inStore ? <p className="pt-2 text-left text-sm font-semibold">Online</p> : <p className="text-xs text-neutral-600">Two ways to give customers their stamp. Use one or both.</p>}
          {p.role === "staff" ? (
            <p className="rounded-2xl bg-sage-100 p-3 text-left text-xs text-neutral-600"><b>A. QR in your order email:</b> the WooCommerce setup holds the shop&apos;s secret, so only the owner sees it.</p>
          ) : <WooOption id={p.id} open={openWoo} />}
          <div className="space-y-2 rounded-2xl bg-sage-100 p-3 text-left text-sm">
            <p className="font-semibold">B. Printed QR cards in the parcel <span className="font-normal text-neutral-600">(any channel: Amazon, Lazada, Shopee…)</span></p>
            <p className="text-xs text-neutral-600">No shop code needed. Print the cards and drop one in each parcel. Every card gives one stamp, once. It can&apos;t show the order&apos;s impact, because a card doesn&apos;t prove what was bought.</p>
            <CardsButton id={p.id} />
          </div>
        </>
      )}
    </div>
  );
}
