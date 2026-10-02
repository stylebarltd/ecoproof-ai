/**
 * Shrinks a receipt photo in the browser before upload: phone photos are often 5-12 MB (or HEIC), which exceeds the
 * ~4.5 MB serverless request limit and the model's image limits. Output is always a JPEG, longest side <= 1800 px.
 */
export async function prepareImage(file: File, maxSide = 1800, quality = 0.85): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.fillStyle = "#fff"; // flatten transparency (PNG screenshots) onto white
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    let q = quality;
    for (let i = 0; i < 4; i++) {
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", q));
      if (blob && blob.size <= 3.5 * 1024 * 1024) return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
      q -= 0.15;
    }
  } catch {
    /* fall through: use the original if it is small enough */
  }
  if (file.size <= 3.5 * 1024 * 1024 && /^image\/(jpeg|png|webp|gif)$/.test(file.type)) return file;
  throw new Error("That photo couldn't be prepared. Try taking it again, or choose a smaller image.");
}
