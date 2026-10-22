/** What "/" shows to the person signed in: their passport, or (shop owners and staff) their "My shop" overview. The navs highlight the matching tab. */
export type RootIs = "passport" | "shop";

export const isPassportPath = (path: string, rootIs: RootIs) =>
  (path === "/" && rootIs === "passport") || path === "/passport" || path.startsWith("/p/") || path.startsWith("/u/") || path.startsWith("/collection");
export const isShopPath = (path: string, rootIs: RootIs) =>
  (path === "/" && rootIs === "shop") || path.startsWith("/join") || path.startsWith("/place/") || path === "/shop" || path.startsWith("/shop/");
