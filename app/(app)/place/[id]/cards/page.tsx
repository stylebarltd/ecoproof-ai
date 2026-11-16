import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { journalFonts } from "@/components/landing/fonts";
import Postcard, { postcardCss, qrImage } from "@/components/Postcard";
import PrintButton from "@/components/PrintButton";
import { cardUrl } from "@/lib/cards";
import { query } from "@/lib/db";
import { roleAt } from "@/lib/members";
import { getSession } from "@/lib/session";
import { getPlace, toPublic } from "@/lib/stampPlaces";

export const dynamic = "force-dynamic";
export const metadata = { title: "Print parcel cards | EcoProof AI", robots: { index: false } };

/**
 * Print sheets for a batch of claim cards (parcel inserts): the same card as the counter postcard (components/Postcard.tsx), so the
 * customer learns what EcoProof AI is, with each card's own single-use QR and code. Four A6 cards per A4 sheet, or eight A7 cards on a
 * landscape sheet (?size=a7). The codes are secrets: it needs ?token=<ADMIN_TOKEN> or someone who runs the place (owner or staff), signed in.
 */
export default async function CardSheet({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ batch?: string; token?: string; size?: string }> }) {
  const { id } = await params;
  const { batch, token, size } = await searchParams;
  const place = await getPlace(id);
  const isAdmin = !!process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
  const session = await getSession(await headers());
  if (!isAdmin && !(place && session && (await roleAt(place.id, session.keys)))) notFound(); // admin token, or someone who runs the place, signed in
  if (!place || !batch) notFound();
  const p = toPublic(place);
  const rows = await query<{ code: string }>("SELECT code FROM claim_cards WHERE place_id=$1 AND batch=$2 ORDER BY created_at, code", [id, batch]);
  if (!rows.length) notFound();
  const small = size === "a7";
  const perSheet = small ? 8 : 4;
  const cards = await Promise.all(rows.map(async (r) => (
    <Postcard
      key={r.code}
      mark="Thank you!"
      headline="Your order earns an eco stamp"
      place={{ name: place.name, imageUrl: p.imageUrl }}
      qr={await qrImage(cardUrl(r.code))}
      code={`${r.code.slice(0, 5)}-${r.code.slice(5)}`}
      steps={[
        ["Scan the code", "with your phone's camera. No app to install, no sign-up."],
        ["Get your stamp", "in your free eco passport. This card works once."],
        ["Meet your Bee Guardian", "Your first stamp unlocks it, and it levels up as you choose more eco places."],
      ]}
    />
  )));
  const sheets = Array.from({ length: Math.ceil(cards.length / perSheet) }, (_, i) => cards.slice(i * perSheet, (i + 1) * perSheet));
  const href = (s?: string) => `/place/${id}/cards?${new URLSearchParams({ batch, ...(token ? { token } : {}), ...(s ? { size: s } : {}) })}`;
  const tab = (on: boolean) => `rounded-full px-3 py-1.5 text-xs font-bold ${on ? "bg-sage-500 text-cream" : "text-sage-900"}`;

  return (
    <div className={`${journalFonts} lg:mx-auto lg:max-w-[720px]`}>
      <style>{postcardCss(small ? { cols: 4, rows: 2, landscape: true } : { cols: 2, rows: 2 })}</style>
      <div className="no-print mb-4 space-y-3">
        <div>
          <h1 className="text-[22px] leading-tight">Cards for your parcels</h1>
          <p className="text-[13px] text-sage-900">{cards.length} card{cards.length > 1 ? "s" : ""} for {p.name}, on {sheets.length} sheet{sheets.length > 1 ? "s" : ""}. Each has its own code and works once, so print every card only once. Below is the first one.</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="glass flex rounded-full p-1" role="group" aria-label="Card size">
            <Link href={href()} replace scroll={false} aria-current={!small} className={tab(!small)}>4 per sheet (A6)</Link>
            <Link href={href("a7")} replace scroll={false} aria-current={small} className={tab(small)}>8 per sheet (A7)</Link>
          </div>
          <PrintButton />
        </div>
        <p className="text-[12px] leading-snug text-sage-900">
          {small ? "Small cards that save paper: cut each sheet once across and three times down." : "Postcard size, the easiest to read: cut each sheet once across and once down."} In the print dialog choose A4{small ? ", landscape" : ""}, margins
          &ldquo;None&rdquo; and turn on &ldquo;Background graphics&rdquo;.
        </p>
      </div>
      {sheets.map((s, i) => <div key={i} className="sheet">{s}</div>)}
    </div>
  );
}
