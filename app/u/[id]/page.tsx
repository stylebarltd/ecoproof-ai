import type { Metadata } from "next";
import PassportView from "@/components/PassportView";
import { getPassport } from "@/lib/passport";
import { tierFor } from "@/lib/nft";

export const dynamic = "force-dynamic";

/** Public, read-only passport: the link a shared passport image points back to. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = decodeURIComponent((await params).id);
  const pass = await getPassport(id);
  const top = [...pass.nfts].sort((a, b) => b.milestone - a.milestone)[0];
  const stamps = pass.totals.receipts;
  const title = `${stamps} eco stamp${stamps === 1 ? "" : "s"}${top ? ` · Eco ${tierFor(top.milestone).name}` : ""} | EcoProof passport`;
  const description = "Every stamp is verified on Solana. Collect yours with EcoProof.";
  const image = `/api/passport-card/${encodeURIComponent(id)}`;
  return { title, description, openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }], type: "website" }, twitter: { card: "summary_large_image", title, description, images: [image] } };
}

export default async function PublicPassport({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const pass = await getPassport(id);
  return <PassportView pass={pass} passportId={id} owner={false} />;
}
