import { ThemeToggle } from "./ThemeToggle";
import Image from "next/image";
import Link from "next/link";
import { HTML_LANG, LOCALE_LABELS, type Dictionary } from "@/lib/i18n";
import { telHref } from "@/lib/format";
import { LOCALES, type Locale } from "@/lib/types";

export function SiteHeader({ locale, path, t, phone }: { locale: Locale; path: string; t: Dictionary["common"]; phone: string }) {
  return (
    <header className="border-b-[3px] border-outline bg-surface">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-gold focus:p-3">
        {t.skip}
      </a>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2 sm:px-6">
        <Link href={`/${locale}`} className="flex items-center gap-2 text-highlight no-underline">
          <Image src="/brand/khushbakhti-logo-256.png" alt="" width={80} height={61} priority className="h-[38px] w-auto sm:h-[52px]" />
          <span className="sign-text text-[21px] leading-none sm:text-[32px]">{t.brand}</span>
        </Link>
        <nav aria-label={t.navMenu} className="order-3 flex w-full items-center gap-x-3 text-[15px] font-bold md:order-none md:w-auto md:flex-auto">
          <Link href={`/${locale}/menu`} className="py-2.5 text-foreground hover:text-highlight">{t.navMenu}</Link>
          <Link href={`/${locale}#visit`} className="py-2.5 text-foreground hover:text-highlight">{t.navVisit}</Link>
          <ThemeToggle lightLabel={t.lightTheme} darkLabel={t.darkTheme} />
          <a href={telHref(phone)} className="py-2.5 text-highlight md:hidden">{t.call}</a>
        </nav>
        <div role="group" aria-label={t.language} className="flex border-2 border-outline">
          {LOCALES.map((l) => (
            <Link
              key={l}
              href={`/${l}${path}`}
              hrefLang={HTML_LANG[l]}
              lang={HTML_LANG[l]}
              aria-current={l === locale ? "true" : undefined}
              className={`flex min-h-11 min-w-[34px] sm:min-w-[48px] items-center justify-center px-1.5 text-[13px] sm:px-2.5 sm:text-[15px] font-bold no-underline ${
                l === locale ? "bg-ink text-white" : "bg-surface text-foreground hover:bg-wash"
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
