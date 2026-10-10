import type { MetadataRoute } from "next";
import { localeAlternates, siteUrl } from "@/lib/site";
import { LOCALES } from "@/lib/types";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const abs = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, `${base}${v}`]));
  return ["", "/menu"].flatMap((path) =>
    LOCALES.map((l) => ({
      url: `${base}/${l}${path}`,
      changeFrequency: "weekly" as const,
      priority: path ? 0.9 : 1,
      alternates: { languages: abs(localeAlternates(path)) },
    })),
  );
}
