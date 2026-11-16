/** Crops a picked logo to a square and shrinks it to 256px in the browser, so uploads stay tiny. A PNG keeps a logo's transparency and
 *  sharp edges; a photo would be too heavy as a PNG, so that becomes a JPEG on white. */
export async function prepareLogo(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const draw = () => ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 256, 256);
  draw();
  const png = c.toDataURL("image/png");
  if (png.length <= 150_000) return png;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 256, 256);
  draw();
  return c.toDataURL("image/jpeg", 0.88);
}
