import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { dishName } from "@/lib/dish-text";
import { getDictionary } from "@/lib/i18n";
import { CITY } from "@/lib/site";
import { getMenu } from "@/lib/store";
import { isLocale } from "@/lib/types";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: `${getDictionary(locale).common.credits} — Хушбахти`, robots: { index: false } };
}

export default async function CreditsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const { dishes, settings } = await getMenu();
  const credited = dishes.filter((d) => d.photoCredit);
  return (
    <>
      <SiteHeader locale={locale} path="/credits" t={t.common} phone={settings.phone} />
      <main id="main" className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
        <h1 className="sign-text m-0 mb-4 text-[44px] leading-none">{t.common.credits}</h1>
        <p className="mb-6 text-muted">{t.common.photoNote}. Wikimedia Commons.</p>
        <ul className="m-0 list-none p-0">
          {credited.map((d) => (
            <li key={d.id} className="border-b border-line py-3">
              <span className="font-bold">{dishName(d, locale)}</span> — {d.photoCredit!.author},{" "}
              {d.photoCredit!.licenseUrl ? <a href={d.photoCredit!.licenseUrl}>{d.photoCredit!.license}</a> : d.photoCredit!.license},{" "}
              <a href={d.photoCredit!.source}>{d.photoCredit!.source.replace(/^https:\/\//, "")}</a>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[15px] text-muted">
          Карта / Map: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>
        </p>
      </main>
      <SiteFooter locale={locale} t={t.common} city={CITY[locale]} />
    </>
  );
}
