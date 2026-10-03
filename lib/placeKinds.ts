// Place kinds, shared by server and client. Physical kinds have a location (map pin, GPS check); "online" does not.
export const PLACE_KINDS = [
  { id: "shop", label: "Shop", plural: "Shops", colour: "#e8a317", physical: true },
  { id: "cafe", label: "Café", plural: "Cafés", colour: "#8c491a", physical: true },
  { id: "restaurant", label: "Restaurant", plural: "Restaurants", colour: "#b2622d", physical: true },
  { id: "market", label: "Market stall", plural: "Markets", colour: "#56633f", physical: true },
  { id: "online", label: "Online shop", plural: "Online shops", colour: "#3d6b8c", physical: false },
] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number]["id"];
export const kindOf = (id: string) => PLACE_KINDS.find((k) => k.id === id);
export const isKind = (id: string): id is PlaceKind => !!kindOf(id);
export const isPhysical = (id: string) => kindOf(id)?.physical ?? true;
/** Join (self-serve) requires every physical place to be at its location when a stamp is claimed. */
export const GPS_RADIUS_M = 150;
