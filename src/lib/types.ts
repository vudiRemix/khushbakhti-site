export const LOCALES = ["ru", "tg", "en", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

/** Languages that are translated from Russian (the source language). */
export const TARGET_LOCALES = ["tg", "en", "zh"] as const;
export type TargetLocale = (typeof TARGET_LOCALES)[number];

export type L10n = Record<Locale, string>;

/**
 * auto    — machine translation, waiting for review
 * checked — reviewed by a person
 * manual  — typed by a person; never overwritten by auto-translation
 * stale   — typed by a person, but the Russian text changed since; kept until reviewed
 * missing — no up-to-date translation (translator not configured or failed); retried on the next save
 */
export type TrStatus = "auto" | "checked" | "manual" | "stale" | "missing";

export interface Category {
  id: string;
  sort: number;
  name: L10n;
  /** Short label for tabs. */
  short: L10n;
  /** Optional note, e.g. portion size for soups. */
  note?: L10n;
}

export interface PhotoCredit {
  author: string;
  license: string;
  licenseUrl?: string;
  source: string;
}

export interface Dish {
  id: string;
  category: string;
  priceTjs: number;
  isNew: boolean;
  available: boolean;
  featured: boolean;
  photo: string | null;
  /** Set for temporary stock photos that require attribution. */
  photoCredit: PhotoCredit | null;
  sort: number;
  name: L10n;
  description: L10n;
  trStatus: Record<TargetLocale, TrStatus>;
  /** Hash of the Russian name + description the translations were made from. */
  sourceHash: string;
  updatedAt: string;
}

export interface Settings {
  plovToday: boolean;
  hoursOpen: string;
  hoursClose: string;
  phone: string;
  /** Digits only, international format without "+", e.g. 992929910009. */
  whatsapp: string;
  /** Telegram username without "@". */
  telegram: string;
  instagram: string;
  deliveryFeeTjs: number;
  address: L10n;
  lat: number;
  lon: number;
  googleMapsUrl: string;
}

export interface MenuData {
  categories: Category[];
  dishes: Dish[];
  settings: Settings;
}

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
