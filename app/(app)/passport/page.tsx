import PassportHome from "@/components/PassportHome";

export const metadata = { title: "My eco passport · EcoProof AI" };

/** The passport at its own address: signed-in customers also get it at "/", anonymous device passports live only here. */
export default function PassportPage() {
  return <PassportHome />;
}
