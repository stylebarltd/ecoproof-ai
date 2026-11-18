import ProductSetup from "@/components/ProductSetup";

export const metadata = { title: "Your plastic-free products | EcoProof" };

export default async function ProductsPage({ params }: { params: Promise<{ id: string }> }) {
  return <ProductSetup id={(await params).id} />;
}
