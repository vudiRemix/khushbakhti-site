import "server-only";
import sharp from "sharp";

const MAX_INPUT_BYTES = 8 * 1024 * 1024;

/** Phone photo → square 1200 px WebP, auto-rotated, metadata stripped. */
export async function processDishPhoto(file: File): Promise<Buffer> {
  if (file.size > MAX_INPUT_BYTES) throw new Error("Фото больше 8 МБ");
  if (!file.type.startsWith("image/")) throw new Error("Это не изображение");
  const input = Buffer.from(await file.arrayBuffer());
  return sharp(input)
    .rotate()
    .resize(1200, 1200, { fit: "cover", position: "attention" })
    .webp({ quality: 80 })
    .toBuffer();
}
