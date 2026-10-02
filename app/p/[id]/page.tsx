import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { query, type RecordRow } from "@/lib/db";
import { getPassport } from "@/lib/passport";
import VerifyButton from "@/components/VerifyButton";
import ShareButtons from "@/components/ShareButtons";
import { LogoLockup } from "@/components/Logo";


export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const rec = (await query<RecordRow>("SELECT * FROM records WHERE id=$1", [id]))[0];
  if (!rec) return {};
  const title = `${rec.co2_kg} kg CO₂ saved · ${rec.plastic_items} plastics avoided | EcoProof`;
  const description = `Verified environmental impact${rec.signature ? ", anchored on Solana" : ""}. Make your impact visible with EcoProof AI.`;
  const image = `/api/card/${id}`;
  return {
    title, description,
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function Passport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rec = (await query<RecordRow>("SELECT * FROM records WHERE id=$1", [id]))[0];
  if (!rec) notFound();
  const pass = await getPassport(rec.user_id);
  const t = { n: pass.totals.receipts, co2: pass.totals.co2Kg, pl: pass.totals.plasticItems, pk: pass.totals.packagingG };
  const proof = rec.signature ? `https://explorer.solana.com/tx/${rec.signature}?cluster=devnet` : "";
  const qr = proof ? await QRCode.toDataURL(proof, { margin: 1, width: 160 }) : "";
  const badges = pass.badges.filter((b) => b.earned).map((b) => `${b.icon} ${b.name}`);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><LogoLockup size={32} /><span className="text-xs uppercase tracking-wider text-neutral-600">Impact passport</span></div>
      {proof ? (
        <a href={proof} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-sage-300">
          <span className="text-2xl text-sage-700">⛓</span>
          <span className="min-w-0 text-sm">
            <b>Anchored on Solana</b> <span className="text-neutral-600">· devnet</span>
            <span className="block truncate font-mono text-[11px] text-neutral-500">tx {rec.signature!.slice(0, 8)}…{rec.signature!.slice(-8)}</span>
          </span>
          <span className="ml-auto text-xs text-sage-700">Explorer ↗</span>
        </a>
      ) : (
        <p className="rounded-2xl bg-terra-100 p-3 text-sm text-terra-800">⏳ On-chain anchoring pending</p>
      )}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[[`${(t.co2 ?? 0).toFixed(1)}kg`, "CO₂ saved"], [String(t.pl ?? 0), "plastics avoided"], [`${t.pk ?? 0}g`, "packaging cut"]].map(([v, l]) => (
          <div key={l} className="rounded-2xl bg-neutral-100 p-3"><div className="font-heading text-xl">{v}</div><div className="text-xs text-neutral-600">{l}</div></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">{badges.map((b) => <span key={b} className="rounded-full bg-sage-500 px-3 py-1 text-sm font-semibold text-cream">{b}</span>)}</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/card/${rec.id}`} alt="Impact card" className="w-full rounded-2xl" />
      <div className="flex items-center gap-4 rounded-[28px] bg-neutral-100 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qr && <img src={qr} alt="Proof QR" width={96} height={96} className="rounded bg-white p-1" />}
        <div className="min-w-0 text-xs text-neutral-600">
          <p className="font-semibold text-ink">{rec.signature ? "Verified on Solana" : "Not yet anchored"}</p>
          <p className="break-all">sha256 {rec.hash}</p>
          {proof && <a className="text-sage-700 underline" href={proof} target="_blank">View transaction</a>}
        </div>
      </div>
      <ShareButtons id={rec.id} co2={rec.co2_kg} plastics={rec.plastic_items} />
      <VerifyButton id={rec.id} />
    </div>
  );
}
