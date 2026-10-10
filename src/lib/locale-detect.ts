import type { Locale } from "./types";

/** Languages of neighbouring countries whose speakers usually read Russian best. */
const RUSSIAN_READERS = new Set(["ru", "uz", "kk", "ky", "uk", "be", "tk", "az", "hy", "ka"]);

/** Pick the site language from an Accept-Language header. Defaults to Russian. */
export function detectLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return "ru";
  const ranked = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { lang: tag.split("-")[0], q: q ? Number(q.slice(2)) || 0 : 1, index };
    })
    .filter((x) => x.lang && x.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const { lang } of ranked) {
    if (lang === "tg") return "tg";
    if (lang === "zh") return "zh";
    if (lang === "en") return "en";
    if (RUSSIAN_READERS.has(lang)) return "ru";
  }
  return ranked.length ? "en" : "ru";
}
