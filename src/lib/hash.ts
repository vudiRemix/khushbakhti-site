import { createHash } from "node:crypto";

/** Short stable hash of the Russian source text a translation was made from. */
export function sourceHash(name: string, description: string): string {
  return createHash("sha256").update(`${name.trim()}\u0000${description.trim()}`).digest("hex").slice(0, 16);
}
