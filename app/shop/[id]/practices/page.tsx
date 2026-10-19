import PracticesEditor from "@/components/PracticesEditor";

export const metadata = { title: "Eco practices | EcoProof" };

export default async function PracticesPage({ params }: { params: Promise<{ id: string }> }) {
  return <PracticesEditor id={(await params).id} />;
}
