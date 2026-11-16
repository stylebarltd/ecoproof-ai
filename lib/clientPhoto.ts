/** Shrinks a picked photo or screenshot in the browser to a JPEG no wider or taller than 1600px, so uploads stay small. Redrawing it
 *  also drops what the camera wrote into the file (where and when it was taken). Quality steps down until it fits `maxBytes`. */
export async function preparePhoto(file: File, maxBytes: number): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff"; // a transparent PNG or screenshot gets a white background, not black
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  for (const q of [0.82, 0.7, 0.55, 0.4]) {
    const blob = await new Promise<Blob | null>((done) => c.toBlob(done, "image/jpeg", q));
    if (blob && blob.size <= maxBytes) return blob;
  }
  throw new Error("too large");
}
