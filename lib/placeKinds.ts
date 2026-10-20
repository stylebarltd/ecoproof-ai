// Place kinds, shared by server and client. The ids match the place types in data/practices.json.
// Cafés, restaurants and hotels are places you visit: they always have a location (map pin, GPS check) and can earn stars.
// An eco shop sells eco products. It has channels: in store (one or more locations on the map) and/or online (order emails,
// parcel cards). Shops show the impact of what customers bought there instead of stars.
export const PLACE_KINDS = [
  { id: "cafe", label: "Café", plural: "Cafés", colour: "#8c491a" },
  { id: "restaurant", label: "Restaurant", plural: "Restaurants", colour: "#b2622d" },
  { id: "hotel", label: "Hotel / resort", plural: "Hotels", colour: "#6b3f22" },
  { id: "eco_shop", label: "Eco shop", plural: "Eco shops", colour: "#e8a317" },
] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number]["id"];
export const kindOf = (id: string) => PLACE_KINDS.find((k) => k.id === id);
export const isKind = (id: string): id is PlaceKind => !!kindOf(id);
/** Eco shops have channels (in store, online); every other kind is a place you visit, so it always has a location. */
export const isShop = (kind: string) => kind === "eco_shop";
/** Join (self-serve) requires every place with a location to be at it when a stamp is claimed. */
export const GPS_RADIUS_M = 150;
