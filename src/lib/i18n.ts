import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import tg from "@/messages/tg.json";
import zh from "@/messages/zh.json";
import type { Locale } from "./types";

export type Dictionary = typeof ru;

const DICTIONARIES: Record<Locale, Dictionary> = { ru, tg, en, zh };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

/** Replace {name} placeholders. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

/** Labels for the language switcher, in each language's own script. */
export const LOCALE_LABELS: Record<Locale, string> = { ru: "РУС", tg: "ТОҶ", en: "ENG", zh: "中文" };

/** Value for <html lang>. */
export const HTML_LANG: Record<Locale, string> = { ru: "ru", tg: "tg", en: "en", zh: "zh-Hans" };
