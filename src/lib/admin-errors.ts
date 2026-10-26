/**
 * Admin error messages, addressed by code in the URL (?error=price). Only these texts can appear,
 * so a crafted link cannot make the admin show arbitrary "system" messages.
 */
export const ADMIN_ERRORS = {
  notfound: "Блюдо не найдено — возможно, его уже удалили.",
  name: "Введите название на русском.",
  price: "Цена — целое число сомони, например 35.",
  category: "Выберите категорию.",
  photo: "Блюдо сохранено, но фото не загрузилось. Выберите другое фото или снимите заново.",
  save: "Не удалось сохранить: нет связи с базой. Проверьте интернет и попробуйте ещё раз.",
  translator: "Сохранено, но переводчик недоступен (не задан GOOGLE_TRANSLATE_API_KEY или кончился лимит). Введите перевод вручную.",
  phone: "Телефон: укажите номер с кодом страны, например +992 92 991 00 09.",
  whatsapp: "WhatsApp: укажите номер с кодом страны, например 992929910009.",
  telegram: "Telegram: укажите имя без @ и ссылки, например Khushbakhti_family.",
  instagram: "Instagram: укажите имя без @ и ссылки, например khushbakhti.family.",
  coords: "Координаты: широта и долгота числами, например 40.2841711 и 69.6324722.",
  maps: "Ссылка на карту должна начинаться с https://",
} as const;

export type AdminError = keyof typeof ADMIN_ERRORS;

export function adminErrorText(code: string | undefined): string | null {
  return code && Object.hasOwn(ADMIN_ERRORS, code) ? ADMIN_ERRORS[code as AdminError] : null;
}
