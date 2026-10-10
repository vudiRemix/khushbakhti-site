"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/auth";
import { processDishPhoto } from "@/lib/images";
import { getStore } from "@/lib/store";
import { refreshTranslations, translateTexts } from "@/lib/translate";
import type { AdminError } from "@/lib/admin-errors";
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

function fail(id: string, code: AdminError, hash = ""): never {
  redirect(`/admin/dishes/${id || "new"}?error=${code}${hash}`);
}

/**
 * Saves the dish form. The per-language buttons («Отметить „проверено“», «Перевести заново») submit the same
 * form with intent=check:<lang> / retranslate:<lang>, so nothing typed is lost; Enter always means «Сохранить».
 * A failed photo or translator still saves everything else and explains what went wrong.
 */
export async function saveDish(formData: FormData) {
  await requireAdmin();
  const store = getStore();
  const menu = await store.getMenu();
  const id = str(formData, "id");
  const existing = id ? menu.dishes.find((d) => d.id === id) : undefined;
  if (id && !existing) fail("", "notfound");

  const nameRu = str(formData, "name_ru");
  const descRu = str(formData, "desc_ru");
  const price = Number(str(formData, "price").replace(/\s|смн|сом\.?/gi, "").replace(",", "."));
  const category = str(formData, "category");
  if (!nameRu) fail(id, "name");
  if (!Number.isInteger(price) || price < 0 || price > 100000) fail(id, "price");
  if (!menu.categories.some((c) => c.id === category)) fail(id, "category");

  const [intent, intentLang] = str(formData, "intent").split(":");
  const lang = TARGET_LOCALES.find((l) => l === intentLang);
  const anchor = lang ? `#tr-${lang}` : "";

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
  const editedNow = new Set<TargetLocale>();
  for (const l of TARGET_LOCALES) {
    const n = str(formData, `name_${l}`);
    const d = str(formData, `desc_${l}`);
    if (formData.has(`name_${l}`) && (n !== dish.name[l] || d !== dish.description[l])) {
      dish.name[l] = n;
      dish.description[l] = d;
      dish.trStatus[l] = n ? "manual" : "missing";
      editedNow.add(l);
    }
  }

  dish = await refreshTranslations(dish, { editedNow });

  let translatorFailed = false;
  if (intent === "check" && lang && dish.name[lang]) dish.trStatus[lang] = "checked";
  if (intent === "retranslate" && lang) {
    const result = await translateTexts([dish.name.ru, dish.description.ru], lang);
    if (result) {
      dish.name[lang] = result[0];
      dish.description[lang] = result[1];
      dish.trStatus[lang] = "auto";
    } else {
      translatorFailed = true;
    }
  }

  let photoFailed = false;
  const photo = formData.get("photo");
  if (formData.get("remove_photo") === "on") {
    dish.photo = null;
    dish.photoCredit = null;
  } else if (photo instanceof File && photo.size > 0) {
    try {
      dish.photo = await store.uploadPhoto(dish.id, await processDishPhoto(photo));
      dish.photoCredit = null;
    } catch (e) {
      console.error("Photo upload failed", e);
      photoFailed = true;
    }
  }

  dish.updatedAt = now;
  try {
    await store.saveDish(dish);
  } catch (e) {
    console.error("Saving the dish failed", e);
    fail(existing ? dish.id : "", "save");
  }
  refreshSite();
  if (photoFailed) fail(dish.id, "photo");
  if (translatorFailed) fail(dish.id, "translator", anchor);
  redirect(`/admin/dishes/${dish.id}?saved=1${anchor}`);
}

export async function deleteDish(formData: FormData) {
  await requireAdmin();
  await getStore().deleteDish(str(formData, "id"));
  refreshSite();
  redirect("/admin?deleted=1");
}

// ---------- settings ----------

/** "+992 92 991 00 09", "929910009" or "992929910009" → "992929910009"; null if it is not a Tajik number. */
function tjDigits(v: string): string | null {
  const d = v.replace(/\D/g, "");
  const full = d.length === 9 ? `992${d}` : d;
  return /^992\d{9}$/.test(full) ? full : null;
}

/** A pasted profile link or "@name" → "name"; null if what is left is not a valid username. */
function username(v: string): string | null {
  const name = v
    .replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me|instagram\.com)\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
  return /^[A-Za-z0-9_.]{3,32}$/.test(name) ? name : null;
}

function coordinate(v: string, limit: number): number | null {
  const n = Number(v.replace(",", "."));
  return v && Number.isFinite(n) && Math.abs(n) <= limit && n !== 0 ? n : null;
}

export async function saveSettings(formData: FormData) {
  await requireAdmin();
  const store = getStore();
  const { settings } = await store.getMenu();
  const bad = (code: AdminError): never => redirect(`/admin/settings?error=${code}`);
  // Empty fields keep the current value; filled ones must be valid, so a typo never breaks a contact link.
  const pick = <T,>(raw: string, parse: (v: string) => T | null, current: T, code: AdminError): T => {
    if (!raw) return current;
    const v = parse(raw);
    return v === null ? bad(code) : v;
  };
  const time = (v: string, fallback: string) => (/^\d{2}:\d{2}$/.test(v) ? v : fallback);
  const fee = Number(str(formData, "delivery_fee"));
  const phoneRaw = str(formData, "phone");
  const next: Settings = {
    ...settings,
    plovToday: formData.get("plov_today") === "on",
    hoursOpen: time(str(formData, "hours_open"), settings.hoursOpen),
    hoursClose: time(str(formData, "hours_close"), settings.hoursClose),
    // Shown as typed; a local 9-digit number gets the country code so the tel: link works.
    phone: pick(phoneRaw, (v) => (!tjDigits(v) ? null : v.replace(/\D/g, "").length === 9 ? `+992 ${v}` : v), settings.phone, "phone"),
    whatsapp: pick(str(formData, "whatsapp"), tjDigits, settings.whatsapp, "whatsapp"),
    telegram: pick(str(formData, "telegram"), username, settings.telegram, "telegram"),
    instagram: pick(str(formData, "instagram"), username, settings.instagram, "instagram"),
    deliveryFeeTjs: Number.isFinite(fee) && fee >= 0 ? Math.round(fee) : settings.deliveryFeeTjs,
    address: {
      ru: str(formData, "address_ru") || settings.address.ru,
      tg: str(formData, "address_tg") || settings.address.tg,
      en: str(formData, "address_en") || settings.address.en,
      zh: str(formData, "address_zh") || settings.address.zh,
    },
    lat: pick(str(formData, "lat"), (v) => coordinate(v, 90), settings.lat, "coords"),
    lon: pick(str(formData, "lon"), (v) => coordinate(v, 180), settings.lon, "coords"),
    googleMapsUrl: pick(str(formData, "google_maps"), (v) => (/^https:\/\/\S+$/.test(v) ? v : null), settings.googleMapsUrl, "maps"),
  };
  try {
    await store.saveSettings(next);
  } catch (e) {
    console.error("Saving settings failed", e);
    bad("save");
  }
  refreshSite();
  redirect("/admin/settings?saved=1");
}
