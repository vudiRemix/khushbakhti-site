import { LOCALES, type Locale } from "./types";

/** Public address of the site; set SITE_URL in production (e.g. https://khushbakhti.vercel.app). */
export function siteUrl(): string {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
  return (process.env.SITE_URL || vercel || "http://localhost:3000").replace(/\/$/, "");
}

export const CITY: Record<Locale, string> = { ru: "Худжанд", tg: "Хуҷанд", en: "Khujand, Tajikistan", zh: "塔吉克斯坦 苦盏" };

export function localeAlternates(path: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const l of LOCALES) map[l === "zh" ? "zh-Hans" : l] = `/${l}${path}`;
  map["x-default"] = `/ru${path}`;
  return map;
}

export function localizedPath(locale: Locale, path = ""): string {
  return `/${locale}${path}`;
}
