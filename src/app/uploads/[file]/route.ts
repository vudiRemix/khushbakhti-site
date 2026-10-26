import { promises as fs } from "node:fs";
import path from "node:path";
import { UPLOAD_NAME, UPLOADS_DIR } from "@/lib/data-dir";

const TYPES: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", png: "image/png" };

/**
 * Serves photos uploaded through the admin on a self-hosted server. `next start` only serves files that were in
 * public/ at build time, so new photos live in data/uploads and come through here (next/image fetches them too).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!UPLOAD_NAME.test(file)) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(path.join(UPLOADS_DIR, file));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[file.split(".").pop()!],
        // A new photo always gets a new name, so the old one can be cached for good.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
