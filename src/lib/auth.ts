import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "kb_admin";
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days
const DEV_PASSWORD = "khushbakhti";

/** Admin password; a fixed default only in local development. */
export function adminPassword(): string | null {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  return process.env.NODE_ENV === "production" ? null : DEV_PASSWORD;
}

function secret(): string {
  const pw = adminPassword() ?? "";
  // Changing ADMIN_PASSWORD also signs everyone out, because the secret derives from it.
  return process.env.SESSION_SECRET || createHash("sha256").update(`kb-session:${pw}`).digest("hex");
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(input: string): boolean {
  const pw = adminPassword();
  if (!pw) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(pw).digest();
  return timingSafeEqual(a, b);
}

export async function startSession(): Promise<void> {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  const value = `${expires}.${sign(String(expires))}`;
  (await cookies()).set(COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  if (!adminPassword()) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [expires, mac] = value.split(".");
  if (!expires || !mac || Number(expires) * 1000 < Date.now()) return false;
  return safeEqual(mac, sign(expires));
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
