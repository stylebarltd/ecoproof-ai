import { listMapPlaces } from "@/lib/stampPlaces";

/** Map data: only places that joined EcoProof. (The old generic OSM places are no longer listed.) */
export async function GET() {
  return Response.json(await listMapPlaces());
}
