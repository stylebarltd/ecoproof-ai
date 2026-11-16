// What a place's photos may be. Shared by the browser (components/PhotosPanel.tsx) and the server (lib/placePhotos.ts).

export const MAX_PHOTOS = 5;
/** The browser sends about 300 KB; this is the ceiling for a detailed photo. */
export const MAX_PHOTO_BYTES = 1_200_000;

export type PlacePhoto = { id: string; url: string };
