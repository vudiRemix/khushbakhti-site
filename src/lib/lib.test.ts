import { describe, expect, it } from "vitest";
import { getDictionary } from "./i18n";
import { detectLocale } from "./locale-detect";
import { buildDeliveryMessage, orderTotal, telegramLink, whatsappLink } from "./order";
import { money, telHref } from "./format";
import { seedMenu } from "./seed";
import { protectTerms, refreshTranslations, unprotect } from "./translate";
import { LOCALES, TARGET_LOCALES } from "./types";

describe("detectLocale", () => {
  it("picks the best supported language by q-value", () => {
    expect(detectLocale("zh-CN,zh;q=0.9,en;q=0.8")).toBe("zh");
    expect(detectLocale("en-US,en;q=0.9,ru;q=0.8")).toBe("en");
    expect(detectLocale("tg-TJ,ru;q=0.8")).toBe("tg");
    expect(detectLocale("de;q=0.9,ru;q=0.95")).toBe("ru");
  });
  it("sends neighbours to Russian and unknown languages to English", () => {
    expect(detectLocale("uz-UZ,uz;q=0.9")).toBe("ru");
    expect(detectLocale("fr-FR")).toBe("en");
    expect(detectLocale(null)).toBe("ru");
    expect(detectLocale("")).toBe("ru");
  });
});

describe("money and phone", () => {
  it("formats somoni per language", () => {
    expect(money("ru", 45)).toBe("45 смн");
    expect(money("tg", 45)).toBe("45 сом.");
    expect(money("en", 45)).toBe("TJS 45");
    expect(money("zh", 5)).toBe("TJS 5");
  });
  it("builds tel links", () => {
    expect(telHref("+992 92 991 00 09")).toBe("tel:+992929910009");
  });
});

describe("delivery order", () => {
  const lines = [
    { nameRu: "Девзира по-самаркандски", qty: 2, priceTjs: 30 },
    { nameRu: "Лагман по-уйгурски", qty: 1, priceTjs: 35 },
  ];
  it("totals the lines", () => expect(orderTotal(lines)).toBe(95));
  it("writes a Russian message with fee, total and address", () => {
    const text = buildDeliveryMessage({ lines, deliveryFeeTjs: 5, address: " ул. Ленина 1 ", guestLanguage: "китайский" });
    expect(text).toContain("— Девзира по-самаркандски × 2 = 60 смн");
    expect(text).toContain("Доставка: 5 смн");
    expect(text).toContain("Итого: 100 смн");
    expect(text).toContain("Адрес: ул. Ленина 1");
    expect(text).toContain("Язык гостя: китайский");
  });
  it("builds messenger links with prefilled text", () => {
    expect(whatsappLink("+992 92 991 00 09", "a b")).toBe("https://wa.me/992929910009?text=a%20b");
    expect(telegramLink("@Khushbakhti_family", "привет")).toBe("https://t.me/Khushbakhti_family?text=%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82");
    expect(telegramLink("Khushbakhti_family")).toBe("https://t.me/Khushbakhti_family");
  });
});

describe("dictionaries", () => {
  const keys = (o: object, p = ""): string[] =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
  it("have the same keys in every language", () => {
    const ru = keys(getDictionary("ru")).sort();
    for (const l of LOCALES) expect(keys(getDictionary(l)).sort()).toEqual(ru);
  });
});

describe("seed", () => {
  const menu = seedMenu();
  it("has the 25 dishes of the paper menu with all four names", () => {
    expect(menu.dishes).toHaveLength(25);
    for (const d of menu.dishes) for (const l of LOCALES) expect(d.name[l], `${d.id}.${l}`).toBeTruthy();
  });
  it("puts every dish in a known category", () => {
    const ids = new Set(menu.categories.map((c) => c.id));
    for (const d of menu.dishes) expect(ids.has(d.category), d.id).toBe(true);
  });
  it("credits every temporary photo", () => {
    for (const d of menu.dishes) if (d.photo?.startsWith("/photos/temp/")) expect(d.photoCredit, d.id).not.toBeNull();
  });
  it("matches the confirmed facts", () => {
    expect(menu.settings.telegram).toBe("Khushbakhti_family");
    expect(menu.settings.whatsapp).toBe("992929910009");
    expect(menu.settings.deliveryFeeTjs).toBe(5);
    expect([menu.settings.hoursOpen, menu.settings.hoursClose]).toEqual(["10:00", "23:00"]);
    expect(menu.dishes.find((d) => d.id === "plovsam")?.name.ru).toBe("Девзира по-самаркандски");
  });
});

describe("translation helpers", () => {
  it("protects glossary terms with the target form", () => {
    const keep = (s: string) => `<span translate="no" class="notranslate">${s}</span>`;
    expect(protectTerms("Плов кенча", "en")).toBe(`${keep("Plov")} ${keep("kencha")}`);
    expect(protectTerms("Мясо «Кавурдок»", "tg")).toContain(keep("Қовурдоқ"));
    expect(protectTerms("Котлета & соус", "en")).toBe("Котлета &amp; соус");
    expect(protectTerms("Порция плова с шурпой", "en")).toBe(`Порция ${keep("plov")} с ${keep("shurpa")}`);
    expect(protectTerms("Табак", "en")).toBe("Табак");
    expect(protectTerms("Пловец", "en")).toBe("Пловец");
  });
  it("unwraps spans and decodes entities", () => {
    expect(unprotect('<span translate="no">Kencha</span> plov &amp; tea &#39;x&#39;')).toBe("Kencha plov & tea 'x'");
    expect(unprotect('<span class="notranslate" translate="no">Plov</span> &#x27;Samarkand&#x27;')).toBe("Plov 'Samarkand'");
  });
  it("re-translates changed dishes but keeps manual translations", async () => {
    const dish = { ...seedMenu().dishes[0] };
    dish.trStatus = { tg: "manual", en: "checked", zh: "checked" };
    dish.name = { ...dish.name, ru: "Новый суп" };
    const fake = async (texts: string[], lang: string) => texts.map((t) => (t ? `[${lang}] ${t}` : ""));
    const next = await refreshTranslations(dish, { translate: fake });
    expect(next.name.tg).toBe(dish.name.tg);
    expect(next.trStatus.tg).toBe("stale");
    for (const l of ["en", "zh"] as const) {
      expect(next.name[l]).toBe(`[${l}] Новый суп`);
      expect(next.trStatus[l]).toBe("auto");
    }
    const again = await refreshTranslations(next, { translate: async () => { throw new Error("must not translate twice"); } });
    expect(again).toBe(next);
  });
  it("marks translations missing when the translator is unavailable and retries them on the next save", async () => {
    const dish = { ...seedMenu().dishes[1], name: { ...seedMenu().dishes[1].name, ru: "Другое имя" } };
    const next = await refreshTranslations(dish, { translate: async () => null });
    for (const l of TARGET_LOCALES) expect(next.trStatus[l]).toBe("missing");
    expect(next.name.en).toBe(dish.name.en);
    const retried = await refreshTranslations(next, { translate: async (t, l) => t.map((x) => (x ? `[${l}] ${x}` : "")) });
    for (const l of TARGET_LOCALES) expect(retried.trStatus[l]).toBe("auto");
    expect(retried.name.en).toBe("[en] Другое имя");
  });
  it("keeps a translation typed in the same save as a Russian change", async () => {
    const dish = { ...seedMenu().dishes[2] };
    dish.name = { ...dish.name, ru: "Новое имя", en: "New name" };
    dish.trStatus = { ...dish.trStatus, en: "manual" };
    const next = await refreshTranslations(dish, { translate: async (t) => t, editedNow: new Set(["en"] as const) });
    expect(next.trStatus.en).toBe("manual");
    expect(next.name.en).toBe("New name");
  });
});
