import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PassportView from "@/components/PassportView";
import { getPassport, publicPassport } from "@/lib/passport";
import { resolvePublicId } from "@/lib/publicId";
import { tierFor } from "@/lib/nft";

export const dynamic = "force-dynamic";

/** Public, read-only passport: the link a shared passport image points back to. Addressed by a public id, never a device id. */
async function load(param: string) {
  const owner = await resolvePublicId(decodeURIComponent(param));
  return owner ? publicPassport(await getPassport(owner)) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const pass = await load((await params).id);
  if (!pass) return {};
  const top = [...pass.nfts].sort((a, b) => b.milestone - a.milestone)[0];
  const points = pass.points;
  const title = `${points} eco point${points === 1 ? "" : "s"}${top ? ` · Eco ${tierFor(top.milestone).name}` : ""} | EcoProof passport`;
  const description = "Every stamp is verified on Solana. Collect yours with EcoProof.";
  const image = `/api/passport-card/${encodeURIComponent(pass.publicId)}`;
  return { title, description, openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }], type: "website" }, twitter: { card: "summary_large_image", title, description, images: [image] } };
}

export default async function PublicPassport({ params }: { params: Promise<{ id: string }> }) {
  const pass = await load((await params).id);
  if (!pass) notFound();
  return <PassportView pass={pass} passportId={pass.publicId} owner={false} />;
}
