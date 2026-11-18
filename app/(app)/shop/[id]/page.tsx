import ShopDashboard from "@/components/ShopDashboard";

export const metadata = { title: "My shop | EcoProof" };

export default async function ShopPage({ params }: { params: Promise<{ id: string }> }) {
  return <ShopDashboard id={(await params).id} />;
}
