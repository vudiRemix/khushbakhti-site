import Image from "next/image";
import Link from "next/link";
import { HTML_LANG, LOCALE_LABELS, type Dictionary } from "@/lib/i18n";
import { telHref } from "@/lib/format";
import { LOCALES, type Locale } from "@/lib/types";

export function SiteHeader({ locale, path, t, phone }: { locale: Locale; path: string; t: Dictionary["common"]; phone: string }) {
  return (
    <header className="border-b-[3px] border-ink bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-gold focus:p-3">
        {t.skip}
      </a>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-7 gap-y-2 px-4 py-2 sm:px-6">
        <Link href={`/${locale}`} className="flex items-center gap-3 text-burgundy no-underline">
          <Image src="/brand/khushbakhti-logo-256.png" alt="" width={80} height={61} priority className="h-[52px] w-auto sm:h-[60px]" />
          <span className="sign-text text-[26px] leading-none sm:text-[32px]">{t.brand}</span>
        </Link>
        <nav aria-label={t.navMenu} className="flex flex-auto flex-wrap gap-x-6 font-bold">
          <Link href={`/${locale}/menu`} className="py-2.5 text-ink hover:text-burgundy">{t.navMenu}</Link>
          <Link href={`/${locale}#visit`} className="py-2.5 text-ink hover:text-burgundy">{t.navVisit}</Link>
        </nav>
        <div role="group" aria-label={t.language} className="flex border-2 border-ink">
          {LOCALES.map((l) => (
            <Link
              key={l}
              href={`/${l}${path}`}
              hrefLang={HTML_LANG[l]}
              lang={HTML_LANG[l]}
              aria-current={l === locale ? "true" : undefined}
              className={`flex min-h-10 min-w-[52px] items-center justify-center px-2.5 text-[15px] font-bold no-underline ${
                l === locale ? "bg-ink text-white" : "bg-white text-ink hover:bg-wash"
              }`}
            >
              {LOCALE_LABELS[l]}
            </Link>
          ))}
        </div>
        <a href={telHref(phone)} className="btn btn-burgundy hidden min-h-11 md:inline-flex">
          {phone}
        </a>
      </div>
    </header>
  );
}
