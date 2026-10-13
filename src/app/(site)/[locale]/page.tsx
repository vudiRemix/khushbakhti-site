import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MachineNote } from "@/components/site/MachineNote";
import { Pakhta } from "@/components/site/Pakhta";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { fill, getDictionary } from "@/lib/i18n";
import { dishName, isMachineTranslated, machineLang } from "@/lib/dish-text";
import { money, telHref } from "@/lib/format";
import { telegramLink, whatsappLink } from "@/lib/order";
import { CITY, siteUrl } from "@/lib/site";
import { getMenu } from "@/lib/store";
import { translatorConfigured } from "@/lib/translate";
import { isLocale, type Dish, type Locale } from "@/lib/types";

export const revalidate = 300;

/** Dish name; unreviewed machine translations get the lang tag Google asks for and a * mark. */
function DishName({ d, locale }: { d: Dish; locale: Locale }) {
  if (!isMachineTranslated(d, locale)) return <>{dishName(d, locale)}</>;
  return <span lang={machineLang(locale)}>{dishName(d, locale)}*</span>;
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const { dishes, settings: s } = await getMenu();

  const plov = dishes.find((d) => d.id === "plovsam");
  const heroIsTemp = !plov?.photo || plov.photo.startsWith("/photos/temp/");
  const heroSrc = heroIsTemp ? "/photos/temp/hero-plov.webp" : plov!.photo!;
  const featured = dishes.filter((d) => d.featured && d.photo).slice(0, 4);
  const anyMachine = dishes.some((d) => isMachineTranslated(d, locale));

  const board = [
    { name: t.home.plov, state: s.plovToday ? t.home.yes : t.home.no, on: s.plovToday },
    { name: t.home.sets, state: t.home.setsState, on: true },
    { name: t.home.delivery, state: money(locale, s.deliveryFeeTjs), on: true },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "Хушбахти (Khushbakhti)",
    url: `${siteUrl()}/${locale}`,
    image: `${siteUrl()}/photos/temp/hero-plov.webp`,
    logo: `${siteUrl()}/brand/khushbakhti-logo-512.png`,
    telephone: s.phone,
    address: { "@type": "PostalAddress", streetAddress: s.address.ru, addressLocality: "Худжанд", addressCountry: "TJ" },
    geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lon },
    hasMenu: `${siteUrl()}/${locale}/menu`,
    servesCuisine: ["Central Asian", "Tajik"],
    sameAs: [`https://www.instagram.com/${s.instagram}/`, telegramLink(s.telegram)],
  };

  return (
    <>
      <SiteHeader locale={locale} path="" t={t.common} phone={s.phone} />
      <main id="main">
        <section className="px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-[1280px]">
            <div className="grid overflow-hidden border-2 border-outline lg:grid-cols-2">
              <div className="flex flex-col justify-center gap-5 bg-burgundy px-5 py-7 text-cream sm:p-9">
                <div lang="tg" className="flex justify-between gap-3 text-[15px] sm:text-[18px]">
                  <span>Тарабхонаи оилавӣ</span><span>Хуҷанд</span>
                </div>
                <h1 lang="tg" className="sign-text m-0 text-[clamp(44px,8vw,96px)] leading-none text-gold">Хушбахтӣ</h1>
                <p className="m-0 max-w-md text-[18px] sm:text-[20px]">{t.home.signSub}</p>
                <div className="flex flex-wrap gap-3">
                  <Link href={`/${locale}/menu`} className="btn btn-gold flex-1 sm:flex-none">{t.home.viewMenu}</Link>
                  <Link href={`/${locale}/menu?mode=delivery`} className="btn border-cream text-cream flex-1 sm:flex-none">{t.home.orderDelivery}</Link>
                </div>
                <a href="#visit" className="text-[15px] text-cream underline underline-offset-4">{s.address[locale]}</a>
              </div>
              <figure className="relative m-0 min-h-[220px] bg-wash sm:min-h-[340px]">
                <Image src={heroSrc} alt={t.home.heroAlt} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
                {heroIsTemp && plov?.photoCredit ? (
                  <figcaption className="absolute bottom-0 left-0 bg-ink/75 px-2.5 py-1 text-[12px] text-white">
                    {t.home.tempPhoto}: {plov.photoCredit.author}, {plov.photoCredit.license}
                  </figcaption>
                ) : null}
              </figure>
            </div>
            <Pakhta id="pakhta-top" height={24} />
            <div className="grid grid-cols-2 gap-4 border-x-2 border-b-2 border-outline bg-surface px-5 py-5 sm:grid-cols-4">
              {board.map((b) => (
                <div key={b.name} className="flex flex-col gap-1">
                  <span className="text-[14px] text-muted">{b.name}</span>
                  <span className={`font-bold ${b.on ? "text-gold" : "text-muted"}`}>{b.state}</span>
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <span className="text-[14px] text-muted">{t.home.hours}</span>
                <span className="font-bold">{s.hoursOpen}–{s.hoursClose}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Menu preview */}
        <section aria-labelledby="menu-title" className="border-y-[3px] border-outline bg-wash px-4 py-8 sm:px-6 sm:py-12">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-9">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-4">
                <h2 id="menu-title" className="sign-text m-0 bg-burgundy px-5 pb-2 pt-2.5 text-[32px] leading-none text-gold sm:text-[44px]">{t.home.popular}</h2>
                <div className="flex flex-col pb-1 font-bold">
                  <span>{t.home.priceNote}</span>
                  <span>{t.home.setsNote}</span>
                </div>
              </div>
              <Link href={`/${locale}/menu`} className="btn btn-ink min-h-[52px]">
                {t.home.fullMenu} →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {featured.map((d) => (
                <Link key={d.id} href={`/${locale}/menu`} className="flex flex-col gap-2.5 text-foreground no-underline">
                  <Image src={d.photo!} alt={dishName(d, locale)} width={600} height={600} sizes="(max-width: 1024px) 50vw, 25vw" className="aspect-square w-full border-[3px] border-outline object-cover" />
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2.5">
                    <span className="sign-text text-[17px] leading-tight [overflow-wrap:anywhere] sm:text-[22px]"><DishName d={d} locale={locale} /></span>
                    <span className="sign-text whitespace-nowrap text-[22px] sm:text-[26px]">{money(locale, d.priceTjs)}</span>
                  </div>
                </Link>
              ))}
            </div>

            {anyMachine ? <MachineNote note={t.common.autoNote} google={translatorConfigured()} /> : null}
          </div>
        </section>

        {/* Visit */}
        <section id="visit" aria-labelledby="visit-title" className="px-4 py-8 sm:px-6 sm:py-12">
          <div className="mx-auto flex max-w-[1280px] flex-wrap gap-7">
            <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-6">
              <h2 id="visit-title" className="sign-text m-0 text-[48px] leading-none sm:text-[58px]">{t.home.visitTitle}</h2>
              <dl className="m-0 grid border-[3px] border-outline sm:grid-cols-3">
                <div className="flex flex-col gap-1 border-b-[3px] border-outline px-5 py-4 sm:border-b-0 sm:border-r-[3px]">
                  <dt className="sign-text text-[20px] text-accent">{t.home.address}</dt>
                  <dd className="m-0 font-bold">{s.address[locale]}</dd>
                </div>
                <div className="flex flex-col gap-1 border-b-[3px] border-outline px-5 py-4 sm:border-b-0 sm:border-r-[3px]">
                  <dt className="sign-text text-[20px] text-accent">{t.home.hours}</dt>
                  <dd className="m-0 font-bold">{s.hoursOpen}–{s.hoursClose}</dd>
                </div>
                <div className="flex flex-col gap-1 px-5 py-4">
                  <dt className="sign-text text-[20px] text-accent">{t.home.phone}</dt>
                  <dd className="m-0 font-bold">
                    {s.phone}
                    <br />
                    {fill(t.home.deliveryLine, { fee: money(locale, s.deliveryFeeTjs) })}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2.5">
                <a href={telHref(s.phone)} className="btn btn-burgundy">{t.common.call}</a>
                <a href={whatsappLink(s.whatsapp)} className="btn btn-outline">WhatsApp</a>
                <a href={telegramLink(s.telegram)} className="btn btn-outline">Telegram</a>
                <a href={`https://www.instagram.com/${s.instagram}/`} className="btn btn-outline">Instagram</a>
                <a href={s.googleMapsUrl} className="btn btn-turq">{t.home.directions}</a>
              </div>
            </div>
            <a href={s.googleMapsUrl} className="relative block min-h-[300px] min-w-0 flex-[1_1_420px] overflow-hidden border-[3px] border-outline sm:min-h-[340px]">
              <Image src="/brand/map-khushbakhti.webp" alt={t.home.mapAlt} fill sizes="(max-width: 900px) 100vw, 45vw" className="object-cover" />
            </a>
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} t={t.common} city={CITY[locale]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
