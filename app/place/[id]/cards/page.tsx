import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { query } from "@/lib/db";
import { cardUrl } from "@/lib/cards";
import { getPlace, toPublic } from "@/lib/stampPlaces";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Print claim cards", robots: { index: false } };

/** Print sheet for a batch of claim cards (parcel inserts). The codes are secrets, so it needs ?token=<ADMIN_TOKEN>. */
export default async function CardSheet({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ batch?: string; token?: string }> }) {
  const { id } = await params;
  const { batch, token } = await searchParams;
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) notFound();
  const place = await getPlace(id);
  if (!place || !batch) notFound();
  const p = toPublic(place);
  const rows = await query<{ code: string }>("SELECT code FROM claim_cards WHERE place_id=$1 AND batch=$2 ORDER BY created_at, code", [id, batch]);
  if (!rows.length) notFound();
  const cards = await Promise.all(rows.map(async (r) => ({ code: r.code, qr: await QRCode.toDataURL(cardUrl(r.code), { margin: 1, width: 220, errorCorrectionLevel: "M", color: { dark: "#272e1b", light: "#ffffff" } }) })));

  return (
    <div>
      <style>{`@media print { nav, .no-print { display: none !important; } body { background: #fff !important; } main { max-width: none !important; padding: 0 !important; } .card { break-inside: avoid; } } .sheet { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }`}</style>
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-600">{cards.length} card{cards.length > 1 ? "s" : ""} for {p.name} · each works once</p>
        <PrintButton />
      </div>
      <div className="sheet">
        {cards.map((c) => (
          <div key={c.code} className="card flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-neutral-400 bg-white p-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.imageUrl} alt="" width={64} height={64} />
            <div className="font-heading text-lg leading-tight">{p.name}</div>
            <div className="text-[11px] text-neutral-600">Thank you for your order!</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.qr} alt="Scan to collect your stamp" width={130} height={130} />
            <div className="text-[13px] font-bold">Scan to collect your eco stamp</div>
            <div className="font-mono text-[11px] tracking-widest text-neutral-600">{c.code.slice(0, 5)}-{c.code.slice(5)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
