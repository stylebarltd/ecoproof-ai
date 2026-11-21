import ScanHome from "@/components/ScanHome";

export const metadata = { title: "Scan | EcoProof", description: "Scan an EcoProof QR code or photograph a receipt from an eco shop to collect a stamp." };

/** The Scan tab (Pola, 2026-11-20): the two ways to collect a stamp with the camera, off the passport page and one tap away from anywhere. */
export default function ScanPage() {
  return <ScanHome />;
}
