import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { query, type RecordRow } from "@/lib/db";
import { getPassport } from "@/lib/passport";
import VerifyButton from "@/components/VerifyButton";


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
      <h1 className="text-2xl font-bold">🌱 EcoProof Passport</h1>
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
      <VerifyButton id={rec.id} />
    </div>
  );
}
