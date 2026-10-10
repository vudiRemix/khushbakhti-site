import credits from "../../data/photo-credits.json";
import menu from "../../data/menu.json";
import { sourceHash } from "./hash";
import type { Category, Dish, MenuData, PhotoCredit, Settings } from "./types";

export const SEED_CATEGORIES: Category[] = [
  {
    id: "soups", sort: 1,
    name: { ru: "Супы", tg: "Шӯрбоҳо", en: "Soups", zh: "汤" },
    short: { ru: "Супы", tg: "Шӯрбо", en: "Soups", zh: "汤" },
    note: { ru: "Порция 0,5 л", tg: "Ҳаҷм 0,5 л", en: "0.5 l portion", zh: "每份 0.5 升" },
  },
  {
    id: "plov", sort: 2,
    name: { ru: "Плов", tg: "Палов", en: "Plov", zh: "抓饭" },
    short: { ru: "Плов", tg: "Палов", en: "Plov", zh: "抓饭" },
  },
  {
    id: "shashlik", sort: 3,
    name: { ru: "Шашлыки", tg: "Кабобҳо", en: "Shashlik", zh: "烤串" },
    short: { ru: "Шашлыки", tg: "Кабобҳо", en: "Shashlik", zh: "烤串" },
  },
  {
    id: "cutlets", sort: 4,
    name: { ru: "Котлеты", tg: "Котлетҳо", en: "Cutlets", zh: "肉饼" },
    short: { ru: "Котлеты", tg: "Котлетҳо", en: "Cutlets", zh: "肉饼" },
  },
  {
    id: "beef", sort: 5,
    name: { ru: "Блюда из говядины", tg: "Таомҳо аз гӯшти гов", en: "Beef dishes", zh: "牛肉菜" },
    short: { ru: "Говядина", tg: "Гӯшти гов", en: "Beef", zh: "牛肉" },
  },
  {
    id: "lamb", sort: 6,
    name: { ru: "Блюда из баранины", tg: "Таомҳо аз гӯшти гӯсфанд", en: "Lamb dishes", zh: "羊肉菜" },
    short: { ru: "Баранина", tg: "Гӯшти гӯсфанд", en: "Lamb", zh: "羊肉" },
  },
];

const FEATURED = new Set(["plovsam", "lagman", "shlamb", "kazan"]);

interface SeedItem {
  id: string;
  category: string;
  price_tjs: number;
  is_new: boolean;
  name: { ru: string };
  translations: { tg: string; en: string; zh: string };
  photo: string | null;
}

interface SeedCredit {
  author: string;
  license: string;
  license_url?: string;
  source: string;
}

export function seedMenu(): MenuData {
  const now = new Date(0).toISOString();
  const creditMap = credits as Record<string, SeedCredit>;
  const dishes: Dish[] = (menu.items as SeedItem[]).map((item, index) => {
    const c = creditMap[item.id];
    const photoCredit: PhotoCredit | null = c
      ? { author: c.author, license: c.license, licenseUrl: c.license_url || undefined, source: c.source }
      : null;
    return {
      id: item.id,
      category: item.category,
      priceTjs: item.price_tjs,
      isNew: item.is_new,
      available: true,
      featured: FEATURED.has(item.id),
      photo: item.photo,
      photoCredit,
      sort: index + 1,
      name: { ru: item.name.ru, ...item.translations },
      description: { ru: "", tg: "", en: "", zh: "" },
      // Tajik was reviewed by us, but a native speaker should confirm it: keep it "auto" so the admin sees it.
      trStatus: { tg: "auto", en: "checked", zh: "checked" },
      sourceHash: sourceHash(item.name.ru, ""),
      updatedAt: now,
    };
  });
  const r = menu.restaurant;
  const settings: Settings = {
    plovToday: true,
    hoursOpen: r.hours.open,
    hoursClose: r.hours.close,
    phone: r.phone,
    whatsapp: r.whatsapp.replace(/\D/g, ""),
    telegram: r.telegram_username.replace(/^@/, ""),
    instagram: r.instagram,
    deliveryFeeTjs: r.delivery.city_fee_tjs,
    address: {
      ru: r.address.ru,
      tg: r.address.tg,
      en: "9a Khushbakhti Lane, Kamoli Khujandi Ave., Khujand",
      zh: "苦盏 Kamoli Khujandi 大街 Khushbakhti 巷 9a 号",
    },
    lat: r.coordinates.lat,
    lon: r.coordinates.lon,
    googleMapsUrl: r.google_maps,
  };
  return { categories: SEED_CATEGORIES, dishes, settings };
}
