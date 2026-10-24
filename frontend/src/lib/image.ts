/**
 * A photo shrunk in the browser before it is uploaded.
 *
 * A phone camera produces 3–8 MB; a menu thumbnail needs a fraction of that, and
 * the API keeps every upload in the database. Re-encoding as JPEG also strips
 * the EXIF block, GPS coordinates included, which nobody meant to publish.
 */
export async function shrinkImage(file: File, maxSide = 1280, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Rasmni o'qib bo'lmadi");
  // JPEG has no transparency; a transparent PNG would otherwise turn black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Rasmni o'qib bo'lmadi"))),
      "image/jpeg",
      quality,
    ),
  );
}
