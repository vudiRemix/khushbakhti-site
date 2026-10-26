import path from "node:path";

/** Where the file store keeps the menu (store.json), uploaded photos and backups. */
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

/** Names FileStore gives uploaded photos; anything else is refused when serving. */
export const UPLOAD_NAME = /^[a-z0-9-]+-\d+\.(webp|jpg|png)$/;
