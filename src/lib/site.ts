import { LOCALES, type Locale } from "./types";

/**
 * Public address of the site. SITE_URL wins (set it in production, e.g. https://khushbakhti.netlify.app);
 * otherwise the production address the host reports, otherwise localhost.
 */
export function siteUrl(): string {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
  // Netlify exposes URL (with SITE_ID) both while building and inside functions.
  const netlify = process.env.SITE_ID && process.env.URL?.startsWith("https://") ? process.env.URL : "";
  return (process.env.SITE_URL || vercel || netlify || "http://localhost:3000").replace(/\/$/, "");
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
