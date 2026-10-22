import { notFound } from "next/navigation";
import { listReports } from "@/lib/moderation";
import ReportsAdmin from "@/components/ReportsAdmin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports", robots: { index: false } };

/** Moderation queue: places with open reports, and places that are paused or suspended. Needs ?token=<ADMIN_TOKEN>. */
export default async function AdminReports({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) notFound();
  return <ReportsAdmin token={token!} initial={await listReports()} />;
}
