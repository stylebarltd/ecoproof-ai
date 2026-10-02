import { listPlaces } from "@/lib/places";

export async function GET() {
  return Response.json(await listPlaces());
}
