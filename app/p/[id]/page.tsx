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
    openGraph: { title, description, images: [{ url: image, width: 1080, height: 566 }], type: "website" },
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
      <div className="flex items-center justify-between"><LogoLockup size={32} /><span className="text-xs uppercase tracking-wider text-emerald-300">Impact passport</span></div>
      {proof ? (
        <a href={proof} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-black/40 p-3 ring-1 ring-[#14F195]/60">
          <span className="text-2xl">⛓️</span>
          <span className="min-w-0 text-sm">
            <b>Anchored on Solana</b> <span className="text-emerald-300">· devnet</span>
            <span className="block truncate font-mono text-[11px] text-emerald-400">tx {rec.signature!.slice(0, 8)}…{rec.signature!.slice(-8)}</span>
          </span>
          <span className="ml-auto text-xs text-emerald-300">Explorer ↗</span>
        </a>
      ) : (
        <p className="rounded-2xl bg-amber-900/40 p-3 text-sm text-amber-200">⏳ On-chain anchoring pending</p>
      )}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[[`${(t.co2 ?? 0).toFixed(1)}kg`, "CO₂ saved"], [String(t.pl ?? 0), "plastic avoided"], [`${t.pk ?? 0}g`, "packaging"]].map(([v, l]) => (
          <div key={l} className="rounded-xl bg-emerald-800/60 p-3"><div className="text-xl font-bold">{v}</div><div className="text-xs text-emerald-300">{l}</div></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">{badges.map((b) => <span key={b} className="rounded-full bg-emerald-500 px-3 py-1 text-sm font-medium text-emerald-950">{b}</span>)}</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/card/${rec.id}`} alt="Impact card" className="w-full rounded-2xl" />
      <div className="flex items-center gap-4 rounded-2xl bg-emerald-900/60 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qr && <img src={qr} alt="Proof QR" width={96} height={96} className="rounded bg-white p-1" />}
        <div className="min-w-0 text-xs text-emerald-300">
          <p className="font-semibold text-emerald-100">{rec.signature ? "Verified on Solana" : "Not yet anchored"}</p>
          <p className="break-all">sha256 {rec.hash}</p>
          {proof && <a className="underline" href={proof} target="_blank">View transaction</a>}
        </div>
      </div>
      <ShareButtons id={rec.id} co2={rec.co2_kg} plastics={rec.plastic_items} />
      <VerifyButton id={rec.id} />
    </div>
  );
}
