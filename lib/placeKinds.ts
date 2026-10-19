// Place kinds, shared by server and client. Physical kinds have a location (map pin, GPS check); "online_shop" does not.
// The ids match the place types in data/practices.json, which says which kinds have a practice checklist and stars.
export const PLACE_KINDS = [
  { id: "cafe", label: "Café", plural: "Cafés", colour: "#8c491a", physical: true },
  { id: "restaurant", label: "Restaurant", plural: "Restaurants", colour: "#b2622d", physical: true },
  { id: "hotel", label: "Hotel / resort", plural: "Hotels", colour: "#6b3f22", physical: true },
  { id: "eco_shop", label: "Eco shop", plural: "Eco shops", colour: "#e8a317", physical: true },
  { id: "online_shop", label: "Online shop", plural: "Online shops", colour: "#3d6b8c", physical: false },
] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number]["id"];
export const kindOf = (id: string) => PLACE_KINDS.find((k) => k.id === id);
export const isKind = (id: string): id is PlaceKind => !!kindOf(id);
export const isPhysical = (id: string) => kindOf(id)?.physical ?? true;
/** Join (self-serve) requires every physical place to be at its location when a stamp is claimed. */
export const GPS_RADIUS_M = 150;
