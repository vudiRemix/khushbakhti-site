import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MenuClient } from "@/components/site/MenuClient";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getDictionary } from "@/lib/i18n";
import { CITY, localeAlternates } from "@/lib/site";
import { getMenu } from "@/lib/store";
import { isLocale } from "@/lib/types";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).meta;
  return { title: t.menuTitle, alternates: { canonical: `/${locale}/menu`, languages: localeAlternates("/menu") } };
}

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { table } = await searchParams;
  const t = getDictionary(locale);
  const { categories, dishes, settings: s } = await getMenu();

  return (
    <>
      <SiteHeader locale={locale} path="/menu" t={t.common} phone={s.phone} />
      <main id="main" className="mx-auto max-w-[1280px] px-4 pb-0 pt-8 sm:px-6 lg:pb-20">
        <div className="mb-5 flex flex-wrap items-end gap-4">
          <h1 className="sign-text m-0 bg-burgundy px-5 pb-2 pt-2.5 text-[56px] leading-none text-gold sm:text-[64px]">{t.menu.title}</h1>
          <div className="flex flex-col pb-1 text-[16px]">
            <span className="font-bold">{t.home.priceNote}</span>
            <span>{t.home.setsNote}</span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className={`size-2.5 ${s.plovToday ? "bg-turq" : "bg-stamp"}`} />
              {t.home.plov}: {s.plovToday ? t.home.yes : t.home.no} · {s.hoursOpen}–{s.hoursClose}
            </span>
          </div>
        </div>
        <MenuClient
          locale={locale}
          t={t.menu}
          table={table && /^\d{1,3}$/.test(table) ? table : undefined}
          phone={s.phone}
          whatsapp={s.whatsapp}
          telegram={s.telegram}
          fee={s.deliveryFeeTjs}
          categories={categories.map((c) => ({ id: c.id, short: c.short[locale], note: c.note?.[locale] }))}
          dishes={dishes.map((d) => ({
            id: d.id,
            category: d.category,
            price: d.priceTjs,
            isNew: d.isNew,
            available: d.available,
            photo: d.photo,
            name: d.name[locale] || d.name.ru,
            nameRu: d.name.ru,
            nameTg: d.name.tg || d.name.ru,
          }))}
        />
        {locale !== "ru" ? <p className="mt-6 text-[14px] text-muted">{t.common.autoNote}</p> : null}
      </main>
      <SiteFooter locale={locale} t={t.common} city={CITY[locale]} />
    </>
  );
}
