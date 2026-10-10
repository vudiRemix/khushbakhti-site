import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "kb_admin";
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days
const DEV_PASSWORD = "khushbakhti";

export const MIN_PASSWORD_LENGTH = 12;

/** Why the admin cannot log in yet, or null when the password is usable. */
export function passwordProblem(): "missing" | "short" | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (pw) return pw.length < MIN_PASSWORD_LENGTH ? "short" : null;
  return devPasswordAllowed() ? null : "missing";
}

/** The fixed default only works on a developer's computer that is not connected to the real database. */
function devPasswordAllowed(): boolean {
  const realData = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
  return process.env.NODE_ENV !== "production" && !realData;
}

/** Admin password, or null when login is impossible (not set or too short). */
export function adminPassword(): string | null {
  if (passwordProblem()) return null;
  return process.env.ADMIN_PASSWORD || DEV_PASSWORD;
}

/**
 * Cookie signing key. It mixes in the password, so changing ADMIN_PASSWORD signs everyone out,
 * and is keyed by a server-only secret, so a copied cookie cannot be used to guess the password offline.
 */
function secret(): string {
  const key = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "kb-session";
  return createHmac("sha256", key).update(`kb-session:${adminPassword() ?? ""}`).digest("hex");
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
