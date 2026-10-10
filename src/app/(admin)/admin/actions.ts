"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/auth";
import { processDishPhoto } from "@/lib/images";
import { getStore } from "@/lib/store";
import { refreshTranslations, translateTexts } from "@/lib/translate";
import { TARGET_LOCALES, type Dish, type Settings, type TargetLocale } from "@/lib/types";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

function refreshSite() {
  revalidatePath("/", "layout");
}

// ---------- session ----------

export async function login(formData: FormData) {
  if (checkPassword(String(formData.get("password") ?? ""))) {
    await startSession();
    redirect("/admin");
  }
  await new Promise((r) => setTimeout(r, 700)); // slow down guessing
  redirect("/admin/login?error=1");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

// ---------- quick toggles ----------

export async function togglePlov() {
  await requireAdmin();
  const store = getStore();
  const { settings } = await store.getMenu();
  await store.saveSettings({ ...settings, plovToday: !settings.plovToday });
  refreshSite();
  revalidatePath("/admin");
}

export async function toggleAvailable(formData: FormData) {
  await requireAdmin();
  const store = getStore();
  const dish = (await store.getMenu()).dishes.find((d) => d.id === str(formData, "id"));
  if (!dish) return;
  await store.saveDish({ ...dish, available: !dish.available, updatedAt: new Date().toISOString() });
  refreshSite();
  revalidatePath("/admin");
}

// ---------- dishes ----------

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", ғ: "gh", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", ӣ: "i", й: "y", к: "k", қ: "q",
  л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ӯ: "u", ф: "f", х: "kh", ҳ: "h", ц: "ts", ч: "ch",
  ҷ: "j", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function newDishId(nameRu: string, taken: Set<string>): string {
  const base =
    nameRu
      .toLowerCase()
      .split("")
      .map((c) => TRANSLIT[c] ?? c)
      .join("")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "dish";
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  return id;
}

function fail(id: string, message: string): never {
  redirect(`/admin/dishes/${id || "new"}?error=${encodeURIComponent(message)}`);
}

export async function saveDish(formData: FormData) {
  await requireAdmin();
  const store = getStore();
  const menu = await store.getMenu();
  const id = str(formData, "id");
  const existing = id ? menu.dishes.find((d) => d.id === id) : undefined;
  if (id && !existing) fail("", "Блюдо не найдено");

  const nameRu = str(formData, "name_ru");
  const descRu = str(formData, "desc_ru");
  const price = Number(str(formData, "price"));
  const category = str(formData, "category");
  if (!nameRu) fail(id, "Введите название на русском");
  if (!Number.isInteger(price) || price < 0 || price > 100000) fail(id, "Цена — целое число сомони");
  if (!menu.categories.some((c) => c.id === category)) fail(id, "Выберите категорию");

  const now = new Date().toISOString();
  let dish: Dish = existing
    ? { ...existing, name: { ...existing.name }, description: { ...existing.description }, trStatus: { ...existing.trStatus } }
    : {
        id: newDishId(nameRu, new Set(menu.dishes.map((d) => d.id))),
        category,
        priceTjs: price,
        isNew: false,
        available: true,
        featured: false,
        photo: null,
        photoCredit: null,
        sort: Math.max(0, ...menu.dishes.map((d) => d.sort)) + 1,
        name: { ru: "", tg: "", en: "", zh: "" },
        description: { ru: "", tg: "", en: "", zh: "" },
        trStatus: { tg: "missing", en: "missing", zh: "missing" },
        sourceHash: "",
        updatedAt: now,
      };

  dish.category = category;
  dish.priceTjs = price;
  dish.isNew = formData.get("is_new") === "on";
  dish.available = formData.get("available") === "on";
  dish.featured = formData.get("featured") === "on";
  dish.name.ru = nameRu;
  dish.description.ru = descRu;

  // A translation the admin edited by hand becomes "manual" and is never overwritten automatically.
  for (const lang of TARGET_LOCALES) {
    const n = str(formData, `name_${lang}`);
    const d = str(formData, `desc_${lang}`);
    if (formData.has(`name_${lang}`) && (n !== dish.name[lang] || d !== dish.description[lang])) {
      dish.name[lang] = n;
      dish.description[lang] = d;
      dish.trStatus[lang] = n ? "manual" : "missing";
    }
  }

  dish = await refreshTranslations(dish);

  const photo = formData.get("photo");
  if (formData.get("remove_photo") === "on") {
    dish.photo = null;
    dish.photoCredit = null;
  } else if (photo instanceof File && photo.size > 0) {
    try {
      dish.photo = await store.uploadPhoto(dish.id, await processDishPhoto(photo));
      dish.photoCredit = null;
    } catch (e) {
      fail(dish.id, `Фото не загрузилось: ${(e as Error).message}`);
    }
  }

  dish.updatedAt = now;
  await store.saveDish(dish);
  refreshSite();
  redirect(`/admin/dishes/${dish.id}?saved=1`);
}

export async function deleteDish(formData: FormData) {
  await requireAdmin();
  await getStore().deleteDish(str(formData, "id"));
  refreshSite();
  redirect("/admin?deleted=1");
}

export async function markChecked(formData: FormData) {
  await requireAdmin();
  const store = getStore();
  const lang = str(formData, "lang") as TargetLocale;
  const dish = (await store.getMenu()).dishes.find((d) => d.id === str(formData, "id"));
  if (!dish || !TARGET_LOCALES.includes(lang)) return;
  await store.saveDish({ ...dish, trStatus: { ...dish.trStatus, [lang]: "checked" } });
  refreshSite();
  redirect(`/admin/dishes/${dish.id}#tr-${lang}`);
}

export async function retranslate(formData: FormData) {
  await requireAdmin();
  const store = getStore();
  const lang = str(formData, "lang") as TargetLocale;
  const dish = (await store.getMenu()).dishes.find((d) => d.id === str(formData, "id"));
  if (!dish || !TARGET_LOCALES.includes(lang)) return;
  const result = await translateTexts([dish.name.ru, dish.description.ru], lang);
  if (!result) fail(dish.id, "Переводчик не настроен (GOOGLE_TRANSLATE_API_KEY) или недоступен");
  await store.saveDish({
    ...dish,
    name: { ...dish.name, [lang]: result[0] },
    description: { ...dish.description, [lang]: result[1] },
    trStatus: { ...dish.trStatus, [lang]: "auto" },
  });
  refreshSite();
  redirect(`/admin/dishes/${dish.id}#tr-${lang}`);
}

// ---------- settings ----------

export async function saveSettings(formData: FormData) {
  await requireAdmin();
  const store = getStore();
  const { settings } = await store.getMenu();
  const time = (v: string, fallback: string) => (/^\d{2}:\d{2}$/.test(v) ? v : fallback);
  const fee = Number(str(formData, "delivery_fee"));
  const lat = Number(str(formData, "lat"));
  const lon = Number(str(formData, "lon"));
  const next: Settings = {
    ...settings,
    plovToday: formData.get("plov_today") === "on",
    hoursOpen: time(str(formData, "hours_open"), settings.hoursOpen),
    hoursClose: time(str(formData, "hours_close"), settings.hoursClose),
    phone: str(formData, "phone") || settings.phone,
    whatsapp: str(formData, "whatsapp").replace(/\D/g, "") || settings.whatsapp,
    telegram: str(formData, "telegram").replace(/^@/, "") || settings.telegram,
    instagram: str(formData, "instagram").replace(/^@/, "") || settings.instagram,
    deliveryFeeTjs: Number.isFinite(fee) && fee >= 0 ? Math.round(fee) : settings.deliveryFeeTjs,
    address: {
      ru: str(formData, "address_ru") || settings.address.ru,
      tg: str(formData, "address_tg") || settings.address.tg,
      en: str(formData, "address_en") || settings.address.en,
      zh: str(formData, "address_zh") || settings.address.zh,
    },
    lat: Number.isFinite(lat) && lat !== 0 ? lat : settings.lat,
    lon: Number.isFinite(lon) && lon !== 0 ? lon : settings.lon,
    googleMapsUrl: str(formData, "google_maps") || settings.googleMapsUrl,
  };
  await store.saveSettings(next);
  refreshSite();
  redirect("/admin/settings?saved=1");
}
