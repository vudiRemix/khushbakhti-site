import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { fontVariables } from "../../fonts";
import "../../globals.css";
import { getDictionary, HTML_LANG } from "@/lib/i18n";
import { localeAlternates, siteUrl } from "@/lib/site";
import { isLocale, LOCALES } from "@/lib/types";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const viewport: Viewport = { themeColor: "#84241E", width: "device-width", initialScale: 1 };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).meta;
  return {
    metadataBase: new URL(siteUrl()),
    title: t.title,
    description: t.description,
    alternates: { canonical: `/${locale}`, languages: localeAlternates("") },
    openGraph: {
      title: t.title,
      description: t.description,
      type: "website",
      locale: HTML_LANG[locale],
      images: [{ url: "/photos/dishes/hero-plov.webp", width: 1500, height: 1000 }],
    },
  };
}

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={HTML_LANG[locale]} className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
