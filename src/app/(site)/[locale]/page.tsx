import { DishLink } from "@/components/site/MotionUI";
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
        <section className="home-hero page-container">
          <div className="hero-copy">
            <p lang="tg" className="hero-location">Тарабхонаи оилавӣ <span aria-hidden="true">·</span> Хуҷанд</p>
            <h1 lang="tg" className="sign-text hero-title">Хушбахтӣ</h1>
            <p className="hero-description">{t.home.signSub}</p>
            <div className="hero-actions">
              <Link href={`/${locale}/menu`} className="btn btn-burgundy">{t.home.viewMenu} <span aria-hidden="true">↗</span></Link>
              <Link href={`/${locale}/menu?mode=delivery`} className="btn btn-outline">{t.home.orderDelivery}</Link>
            </div>
            <a href="#visit" className="hero-address">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
              {s.address[locale]}
            </a>
          </div>
          <figure className="hero-photo">
            <Image src={heroSrc} alt={t.home.heroAlt} fill priority sizes="(max-width: 900px) 100vw, 55vw" className="object-cover" />
            {heroIsTemp && plov?.photoCredit ? (
              <figcaption className="photo-credit">{t.home.tempPhoto}: {plov.photoCredit.author}, {plov.photoCredit.license}</figcaption>
            ) : null}
            <div className="hero-pattern"><Pakhta id="pakhta-top" height={20} /></div>
          </figure>
        </section>
        <section className="page-container" aria-label={t.home.today}>
          <div className="today-strip">
            {board.map((b) => (
              <div key={b.name} className="today-item"><span>{b.name}</span><strong className={b.on ? "text-highlight" : "text-muted"}>{b.state}</strong></div>
            ))}
            <div className="today-item"><span>{t.home.hours}</span><strong>{s.hoursOpen}–{s.hoursClose}</strong></div>
          </div>
        </section>

        <section aria-labelledby="menu-title" className="home-menu page-container">
          <div className="section-heading">
            <div><h2 id="menu-title" className="sign-text">{t.home.popular}</h2><p>{t.home.priceNote} <span aria-hidden="true">·</span> {t.home.setsNote}</p></div>
            <Link href={`/${locale}/menu`} className="section-link">{t.home.fullMenu} <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="featured-grid">
            {featured.map((d) => (
              <DishLink key={d.id} href={`/${locale}/menu`}>
                <div className="dish-preview-photo"><Image src={d.photo!} alt={dishName(d, locale)} width={600} height={600} sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 25vw" className="aspect-[4/5] w-full object-cover" /></div>
                <div className="dish-preview-caption"><h3><DishName d={d} locale={locale} /></h3><span>{money(locale, d.priceTjs)}</span></div>
              </DishLink>
            ))}
          </div>
          {anyMachine ? <MachineNote note={t.common.autoNote} google={translatorConfigured()} /> : null}
        </section>

        <section id="visit" aria-labelledby="visit-title" className="home-visit">
          <div className="page-container visit-grid">
            <div className="visit-copy">
              <h2 id="visit-title" className="sign-text">{t.home.visitTitle}</h2>
              <dl className="visit-details">
                <div><dt>{t.home.address}</dt><dd>{s.address[locale]}</dd></div>
                <div><dt>{t.home.hours}</dt><dd>{s.hoursOpen}–{s.hoursClose}</dd></div>
                <div><dt>{t.home.phone}</dt><dd><a href={telHref(s.phone)}>{s.phone}</a></dd></div>
              </dl>
              <p className="text-muted">{fill(t.home.deliveryLine, { fee: money(locale, s.deliveryFeeTjs) })}</p>
              <div className="visit-actions">
                <a href={s.googleMapsUrl} className="btn btn-burgundy">{t.home.directions} <span aria-hidden="true">↗</span></a>
                <a href={telHref(s.phone)} className="btn btn-outline">{t.common.call}</a>
              </div>
              <div className="social-links"><a href={whatsappLink(s.whatsapp)}>WhatsApp ↗</a><a href={telegramLink(s.telegram)}>Telegram ↗</a><a href={`https://www.instagram.com/${s.instagram}/`}>Instagram ↗</a></div>
            </div>
            <a href={s.googleMapsUrl} className="visit-map"><Image src="/brand/map-khushbakhti.webp" alt={t.home.mapAlt} fill sizes="(max-width: 900px) 100vw, 50vw" className="object-cover" /></a>
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} t={t.common} city={CITY[locale]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
