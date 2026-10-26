import { HTML_LANG } from "./i18n";
import type { Dish, Locale } from "./types";

/** Dish name in the visitor's language, falling back to Russian while there is no translation. */
export function dishName(d: Dish, locale: Locale): string {
  return (locale !== "ru" && d.name[locale]) || d.name.ru;
}

/** The visitor sees an unreviewed machine translation of this dish (marked with * on the site). */
export function isMachineTranslated(d: Dish, locale: Locale): boolean {
  return locale !== "ru" && !!d.name[locale] && d.trStatus[locale] === "auto";
}

/** BCP 47 tag Google asks for on pages with unedited machine translations, e.g. "en-x-mtfrom-ru". */
export function machineLang(locale: Locale): string {
  return `${HTML_LANG[locale]}-x-mtfrom-ru`;
}
