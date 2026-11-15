import PracticesEditor from "@/components/PracticesEditor";

export const metadata = { title: "Eco practices and shop settings | EcoProof AI" };

export default async function PracticesPage({ params }: { params: Promise<{ id: string }> }) {
  return <PracticesEditor id={(await params).id} />;
}
