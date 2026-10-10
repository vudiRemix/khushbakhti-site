import "server-only";

const MAX_INPUT_BYTES = 8 * 1024 * 1024;
/** Without sharp we keep the browser-shrunk file as is, but only if it is small enough to serve. */
const MAX_PASSTHROUGH_BYTES = 2 * 1024 * 1024;

export interface ProcessedPhoto {
  data: Buffer;
  contentType: "image/webp" | "image/jpeg" | "image/png";
  ext: "webp" | "jpg" | "png";
}

function sniff(buf: Buffer): Omit<ProcessedPhoto, "data"> | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { contentType: "image/jpeg", ext: "jpg" };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { contentType: "image/png", ext: "png" };
  if (buf.length > 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return { contentType: "image/webp", ext: "webp" };
  return null;
}

/**
 * Phone photo → square 1200 px WebP, auto-rotated, metadata stripped.
 * sharp is loaded lazily: if its native binary is unavailable on the host, the rest of the admin keeps working
 * and the photo already shrunk in the browser (PhotoInput) is stored unchanged.
 */
export async function processDishPhoto(file: File): Promise<ProcessedPhoto> {
  if (file.size > MAX_INPUT_BYTES) throw new Error("Фото больше 8 МБ");
  if (!file.type.startsWith("image/")) throw new Error("Это не изображение");
  const input = Buffer.from(await file.arrayBuffer());
  let sharpError: unknown;
  try {
    const { default: sharp } = await import("sharp");
    const data = await sharp(input)
      .rotate()
      .resize(1200, 1200, { fit: "cover", position: "attention" })
      .webp({ quality: 80 })
      .toBuffer();
    return { data, contentType: "image/webp", ext: "webp" };
  } catch (error) {
    sharpError = error;
  }
  const kind = sniff(input);
  if (!kind) throw new Error("Формат фото не поддерживается — выберите JPEG или PNG");
  if (input.length > MAX_PASSTHROUGH_BYTES) {
    console.error("sharp failed and the photo is too large to store unchanged", sharpError);
    throw new Error("Не удалось обработать фото — выберите фото поменьше");
  }
  console.warn("sharp unavailable, storing the browser-processed photo unchanged", sharpError);
  return { data: input, ...kind };
}
