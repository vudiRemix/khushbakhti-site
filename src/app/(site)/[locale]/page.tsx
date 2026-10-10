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
  const { categories, dishes, settings: s } = await getMenu();

  const plov = dishes.find((d) => d.id === "plovsam");
  const heroIsTemp = !plov?.photo || plov.photo.startsWith("/photos/temp/");
  const heroSrc = heroIsTemp ? "/photos/temp/hero-plov.webp" : plov!.photo!;
  const featured = dishes.filter((d) => d.featured && d.photo).slice(0, 4);
  const groups = categories
    .map((c) => ({ c, items: dishes.filter((d) => d.category === c.id) }))
    .filter((g) => g.items.length);
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
        {/* Sign board */}
        <section className="px-4 pt-6 sm:px-6 sm:pt-7">
          <div className="mx-auto max-w-[1280px]">
            <div className="flex flex-col gap-2.5 border-[10px] border-turq bg-burgundy px-5 pb-8 pt-6 text-gold shadow-[inset_0_0_0_5px_var(--color-burgundy),inset_0_0_0_8px_var(--color-gold)] sm:border-[12px] sm:px-10">
              <div lang="tg" className="sign-text flex flex-wrap justify-between gap-2 text-[18px] tracking-[0.06em] text-cream sm:text-[26px]">
                <span>Тарабхонаи оилавӣ</span>
                <span>Хуҷанд</span>
              </div>
              <h1 lang="tg" className="sign-text m-0 text-[clamp(52px,12vw,190px)] leading-[0.95]">Хушбахтӣ</h1>
              <p className="m-0 mt-1 text-[18px] font-bold text-cream sm:text-[20px]">{t.home.signSub}</p>
            </div>
            <Pakhta id="pakhta-top" />
          </div>
        </section>

        {/* Photo + today board */}
        <section className="px-4 pb-16 pt-10 sm:px-6">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-stretch gap-7">
            <figure className="relative m-0 min-h-[300px] min-w-0 flex-[3_1_560px] overflow-hidden border-[3px] border-ink bg-wash sm:min-h-[440px]">
              <Image src={heroSrc} alt={t.home.heroAlt} fill priority sizes="(max-width: 900px) 100vw, 60vw" className="object-cover" />
              {heroIsTemp && plov?.photoCredit ? (
                <figcaption className="absolute bottom-0 left-0 bg-ink/75 px-2.5 py-1 text-[13px] text-white">
                  {t.home.tempPhoto}: {plov.photoCredit.author}, {plov.photoCredit.license}
                </figcaption>
              ) : null}
            </figure>
            <section aria-labelledby="today" className="flex min-w-0 flex-[2_1_340px] flex-col gap-1.5 border-[12px] border-wood bg-board px-7 py-6 font-[family-name:var(--font-chalk)] text-chalk">
              <h2 id="today" className="m-0 mb-1.5 text-[58px] font-bold leading-none text-gold">{t.home.today}</h2>
              {board.map((b) => (
                <div key={b.name} className="flex items-baseline justify-between gap-3 border-b-2 border-dashed border-chalk/35 py-2 text-[32px] leading-tight">
                  <span>{b.name}</span>
                  <span className={b.on ? "text-gold" : "line-through opacity-75"}>{b.state}</span>
                </div>
              ))}
              <p className="m-0 mt-auto pt-4 text-[30px]">
                {t.home.open} {s.hoursOpen}–{s.hoursClose}
              </p>
            </section>
          </div>
        </section>

        {/* Menu preview */}
        <section aria-labelledby="menu-title" className="border-y-[3px] border-ink bg-wash px-4 py-16 sm:px-6">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-9">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-4">
                <h2 id="menu-title" className="sign-text m-0 bg-burgundy px-5 pb-2 pt-2.5 text-[52px] leading-none text-gold sm:text-[60px]">{t.home.menu}</h2>
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
                <Link key={d.id} href={`/${locale}/menu`} className="flex flex-col gap-2.5 text-ink no-underline">
                  <Image src={d.photo!} alt={dishName(d, locale)} width={600} height={600} sizes="(max-width: 1024px) 50vw, 25vw" className="aspect-square w-full border-[3px] border-ink object-cover" />
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2.5">
                    <span className="sign-text text-[17px] leading-tight [overflow-wrap:anywhere] sm:text-[22px]"><DishName d={d} locale={locale} /></span>
                    <span className="sign-text whitespace-nowrap text-[22px] sm:text-[26px]">{money(locale, d.priceTjs)}</span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="grid gap-x-14 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
              {groups.map(({ c, items }) => (
                <div key={c.id} className="flex flex-col">
                  <h3 className="sign-text m-0 mb-1.5 border-b-[3px] border-turq pb-2 text-[28px] leading-none text-turq">
                    {c.name[locale]}
                    {c.note ? <span className="ml-2 font-[family-name:var(--font-text)] text-[15px] normal-case text-muted">{c.note[locale]}</span> : null}
                  </h3>
                  {items.map((d) => (
                    <div key={d.id} className="flex items-baseline gap-2.5 py-2">
                      {d.isNew ? <span className="stamp-new">{t.menu.new}</span> : null}
                      <span className={`text-[18px] font-bold leading-tight ${d.available ? "" : "text-muted line-through"}`}><DishName d={d} locale={locale} /></span>
                      <span aria-hidden="true" className="min-w-6 flex-1 -translate-y-1.5 border-b-2 border-dotted border-ink" />
                      <span className="sign-text text-[26px] leading-none">{d.priceTjs}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {anyMachine ? <MachineNote note={t.common.autoNote} google={translatorConfigured()} /> : null}
          </div>
        </section>

        {/* Visit */}
        <section id="visit" aria-labelledby="visit-title" className="px-4 py-16 sm:px-6">
          <div className="mx-auto flex max-w-[1280px] flex-wrap gap-7">
            <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-6">
              <h2 id="visit-title" className="sign-text m-0 text-[48px] leading-none sm:text-[58px]">{t.home.visitTitle}</h2>
              <dl className="m-0 grid border-[3px] border-ink sm:grid-cols-3">
                <div className="flex flex-col gap-1 border-b-[3px] border-ink px-5 py-4 sm:border-b-0 sm:border-r-[3px]">
                  <dt className="sign-text text-[20px] text-turq">{t.home.address}</dt>
                  <dd className="m-0 font-bold">{s.address[locale]}</dd>
                </div>
                <div className="flex flex-col gap-1 border-b-[3px] border-ink px-5 py-4 sm:border-b-0 sm:border-r-[3px]">
                  <dt className="sign-text text-[20px] text-turq">{t.home.hours}</dt>
                  <dd className="m-0 font-bold">{s.hoursOpen}–{s.hoursClose}</dd>
                </div>
                <div className="flex flex-col gap-1 px-5 py-4">
                  <dt className="sign-text text-[20px] text-turq">{t.home.phone}</dt>
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
            <a href={s.googleMapsUrl} className="relative block min-h-[300px] min-w-0 flex-[1_1_420px] overflow-hidden border-[3px] border-ink sm:min-h-[340px]">
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
