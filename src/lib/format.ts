import type { Locale } from "./types";

/** Price in somoni the way each language writes it. */
export function money(locale: Locale, amount: number): string {
  switch (locale) {
    case "ru":
      return `${amount} смн`;
    case "tg":
      return `${amount} сом.`;
    default:
      return `TJS ${amount}`;
  }
}

/** "+992 92 991 00 09" → "tel:+992929910009" */
export function telHref(phone: string): string {
  return `tel:+${phone.replace(/\D/g, "")}`;
}
