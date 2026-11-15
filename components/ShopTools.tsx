"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicPlace } from "@/lib/stampPlaces";
import type { PlaceStars } from "@/lib/placePractices";
import type { ShopImpactData } from "@/components/ShopImpact";

// The ways a place gives out stamps: its counter QR, printed cards for parcels, and the WooCommerce connection.
// Shown in the shop dashboard (/shop/[id]) as panels that match the rest of the page.

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
    <button type="button" onClick={go} aria-live="polite" className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 transition-colors ${state === "done" ? "bg-sage-500 text-cream ring-sage-500" : state === "fail" ? "bg-terra-100 text-terra-800 ring-terra-800/30" : "bg-white ring-sage-900/15 hover:bg-cream"} ${className}`}>
      {state === "done" ? "Copied ✓" : state === "fail" ? "Select and copy by hand" : label}
    </button>
  );
}

export type MyPlace = PublicPlace & { status?: string; statusNote?: string | null; role?: "owner" | "staff"; stars?: PlaceStars | null; impact?: ShopImpactData | null };
type WooSetup = { plugin: { download: string; placeId: string; secret: string }; webhook: { deliveryUrl: string; secret: string; topic: string }; themeSnippet: string; themeSnippetOwnEmail: string };

const BLOCK = "space-y-2 rounded-2xl bg-white/60 p-3 text-sm";
const MUTED = "text-[12.5px] leading-snug text-sage-900";

/** The WooCommerce connection: place id and secret for the plugin, and the by-hand way. `open` loads the steps straight away
 *  (the dashboard's "Set up the plugin" card lands here). The plugin knows the app's address itself, so there is no URL to enter. */
export function WooOption({ id, open = false }: { id: string; open?: boolean }) {
  const [setup, setSetup] = useState<WooSetup | null>(null);
  const [msg, setMsg] = useState("");
  const load = () => fetch(`/api/places/mine/${id}/woo`).then(async (r) => {
    const j = await r.json().catch(() => ({}));
    if (r.ok) setSetup(j); else setMsg(j.error || "Could not load the setup");
  });
  useEffect(() => { if (open && !setup) void load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const field = (label: string, value: string, secret = false) => (
    <span className="mt-1.5 flex items-center gap-2 rounded-xl bg-white px-2.5 py-1.5 ring-1 ring-sage-900/15">
      <span className="shrink-0 text-sage-900">{label}</span>
      <code className="min-w-0 flex-1 select-all truncate text-[12.5px]">{value}</code>
      <CopyButton text={value} />
      {secret && <span className="sr-only">(keep it private)</span>}
    </span>
  );
  return (
    <div id="woo-setup" className={BLOCK}>
      <p className="font-bold">QR in your order email <span className="font-normal text-sage-900">(WooCommerce)</span></p>
      <p className={MUTED}>Install the free EcoProof AI plugin. When an order is paid, your customer gets a personal button and QR in their order email. It&apos;s signed per order, so their stamp is a verified purchase with the real impact of what they bought.</p>
      {!setup ? (
        <button onClick={() => void load()} className="rounded-full bg-white px-3.5 py-2 text-xs font-bold ring-1 ring-sage-900/15">Show setup steps</button>
      ) : (
        <>
          <ol className="list-decimal space-y-2.5 pl-4 text-[12.5px] leading-snug">
            <li><a href={setup.plugin.download} download className="inline-block rounded-full bg-honey-500 px-3.5 py-1.5 font-bold text-ink">Download the plugin</a></li>
            <li>In WordPress: <b>Plugins → Add New → Upload Plugin</b>, choose the file, <b>Install</b>, then <b>Activate</b>.</li>
            <li>Open <b>WooCommerce → Settings → EcoProof AI</b> and fill in:
              {field("Place id", setup.plugin.placeId)}
              {field("Secret", setup.plugin.secret, true)}
              <span className="mt-1.5 block text-sage-900">Keep the secret private: it signs every order and every claim link.</span>
            </li>
            <li>Click <b>Save changes</b>, then <b>Test connection</b>. It should say &ldquo;EcoProof AI is connected&rdquo;.</li>
          </ol>
          <p className={MUTED}>That&apos;s it. The stamp appears in WooCommerce&apos;s <b>Processing order</b> email (sent when an order is paid). Using <b>FunnelKit</b>? It shows below the Order Summary block automatically. Other email builders: add the <code>[ecoproof_stamp]</code> shortcode, or switch on the separate stamp email in the plugin settings.</p>
          <details className={MUTED}>
            <summary className="cursor-pointer font-bold">Can&apos;t install plugins? Set it up by hand</summary>
            <ol className="mt-2 list-decimal space-y-2 pl-4">
              <li>In WooCommerce: <b>Settings → Advanced → Webhooks → Add webhook</b>. Name EcoProof AI, Status Active, Topic <b>{setup.webhook.topic}</b>, API version WP REST API v3.</li>
              <li>Delivery URL: <code className="break-all">{setup.webhook.deliveryUrl}</code> <CopyButton text={setup.webhook.deliveryUrl} /></li>
              <li>Secret: the one above.</li>
              <li>Paste this into your <b>child theme&apos;s functions.php</b>: <CopyButton text={setup.themeSnippet} label="copy snippet" />
                <textarea readOnly value={setup.themeSnippet} rows={5} className="mt-1 w-full rounded-xl bg-white p-2 font-mono text-[10px] ring-1 ring-sage-900/15" /></li>
              <li>If your order emails come from another plugin and the QR doesn&apos;t show up, use this snippet instead: it sends its own short email. <CopyButton text={setup.themeSnippetOwnEmail} label="copy snippet B" /></li>
            </ol>
            <p className="mt-2">This way only reacts to <b>completed</b> orders. The plugin also handles paid (processing) orders, refunds and retries.</p>
          </details>
        </>
      )}
      {msg && <p className="text-xs text-terra-800">{msg}</p>}
    </div>
  );
}

/** A place's ways to give stamps, one panel per channel: the counter QR in store, and the order email and parcel cards online.
 *  Each is a glass panel like the rest of the dashboard. Staff see everything except the WooCommerce setup, which holds the shop's secret. */
export function StampTools({ p, openWoo = false }: { p: MyPlace; openWoo?: boolean }) {
  const panel = "glass rounded-[28px] p-4 lg:p-5";
  return (
    <>
      {p.inStore && (
        <section className={panel}>
          <h2 className="text-[17px] leading-tight">In your shop</h2>
          <p className={`mt-0.5 ${MUTED}`}>Customers scan this at the counter. One stamp per visit.</p>
          <div className="mt-3 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.qrUrl} alt={`QR code to collect a ${p.name} stamp`} width={140} height={140} className="h-[120px] w-[120px] shrink-0 rounded-xl bg-white p-1.5 lg:h-[140px] lg:w-[140px]" />
            <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm font-semibold">
              <Link href={`/place/${p.id}`} className="rounded-full bg-honey-500 py-2.5 text-center text-ink">Print counter card</Link>
              <Link href={`/c/${p.id}`} className="rounded-full border-[1.5px] border-sage-900/20 bg-white/70 py-2.5 text-center">Preview stamp page</Link>
              <p className="hidden text-[11.5px] font-normal leading-snug text-sage-900 lg:block">Try it: scan the QR with your phone&apos;s camera to see what customers see.</p>
            </div>
          </div>
        </section>
      )}
      {p.online && (
        <section className={`${panel} space-y-3`}>
          <div>
            <h2 className="text-[17px] leading-tight">Online orders</h2>
            <p className={`mt-0.5 ${MUTED}`}>Two ways to give customers their stamp. Use one or both.</p>
          </div>
          {p.role === "staff" ? (
            <p className={BLOCK}><b>QR in your order email:</b> <span className="text-sage-900">the WooCommerce setup holds the shop&apos;s secret, so only the owner sees it.</span></p>
          ) : <WooOption id={p.id} open={openWoo} />}
          <div className={BLOCK}>
            <p className="font-bold">Printed cards in the parcel <span className="font-normal text-sage-900">(any channel: Amazon, Lazada, Shopee…)</span></p>
            <p className={MUTED}>No shop code needed. Print the cards and drop one in each parcel. Every card gives one stamp, once. It can&apos;t show the order&apos;s impact, because a card doesn&apos;t prove what was bought.</p>
            <CardsButton id={p.id} />
          </div>
        </section>
      )}
    </>
  );
}
