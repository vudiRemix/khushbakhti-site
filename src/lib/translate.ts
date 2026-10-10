import { sourceHash } from "./hash";
import { TARGET_LOCALES, type Dish, type TargetLocale } from "./types";

/**
 * Dish names that machine translation tends to mangle. Each Russian term is swapped for the
 * target-language form inside a translate="no" span before the text goes to the translator.
 */
export const GLOSSARY: Array<{ ru: string; tg: string; en: string; zh: string }> = [
  { ru: "плов", tg: "палов", en: "plov", zh: "抓饭" },
  { ru: "девзира", tg: "девзира", en: "devzira", zh: "德夫兹拉" },
  { ru: "кенча", tg: "кенча", en: "kencha", zh: "肯恰" },
  { ru: "шурпа", tg: "шӯрбо", en: "shurpa", zh: "肉汤" },
  { ru: "лагман", tg: "лағмон", en: "lagman", zh: "拉条子" },
  { ru: "кавурдок", tg: "қовурдоқ", en: "kavurdak", zh: "卡乌尔达克" },
  { ru: "чазза", tg: "чазза", en: "chazza", zh: "恰扎" },
  { ru: "мошпиёба", tg: "мошпиёба", en: "moshpiyoba", zh: "绿豆汤" },
  { ru: "табака", tg: "табака", en: "tabaka", zh: "塔巴卡" },
  { ru: "хушбахти", tg: "Хушбахтӣ", en: "Khushbakhti", zh: "Khushbakhti" },
];

const API_LANG: Record<TargetLocale, string> = { tg: "tg", en: "en", zh: "zh-CN" };

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function decodeHtml(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Wrap glossary terms (whole words, any case) in no-translate spans with the target form. */
export function protectTerms(text: string, target: TargetLocale): string {
  let html = escapeHtml(text);
  for (const term of GLOSSARY) {
    const re = new RegExp(`(^|[^\\p{L}])(${term.ru})(?=$|[^\\p{L}])`, "giu");
    html = html.replace(re, (_, pre: string, word: string) => {
      const capital = word[0] === word[0].toUpperCase();
      const out = capital ? term[target][0].toUpperCase() + term[target].slice(1) : term[target];
      return `${pre}<span translate="no">${out}</span>`;
    });
  }
  return html;
}

export function unprotect(html: string): string {
  return decodeHtml(html.replace(/<span translate="no">([\s\S]*?)<\/span>/g, "$1")).replace(/\s+/g, " ").trim();
}

export function translatorConfigured(): boolean {
  return !!process.env.GOOGLE_TRANSLATE_API_KEY;
}

/** Google Cloud Translation v2. Returns null when no key is configured or the call fails. */
export async function translateTexts(texts: string[], target: TargetLocale): Promise<string[] | null> {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) return null;
  const nonEmpty = texts.map((t) => t.trim());
  if (nonEmpty.every((t) => !t)) return texts.map(() => "");
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: nonEmpty.map((t) => protectTerms(t, target)),
      source: "ru",
      target: API_LANG[target],
      format: "html",
    }),
  });
  if (!res.ok) {
    console.error("Translate API error", res.status, await res.text().catch(() => ""));
    return null;
  }
  const json = (await res.json()) as { data: { translations: Array<{ translatedText: string }> } };
  return json.data.translations.map((t, i) => (nonEmpty[i] ? unprotect(t.translatedText) : ""));
}

/**
 * Bring a dish's translations up to date after its Russian text changed.
 * Manual translations are kept; others are re-translated (status "auto"),
 * or marked "missing" when the translator is unavailable.
 */
export async function refreshTranslations(dish: Dish, translate = translateTexts): Promise<Dish> {
  const hash = sourceHash(dish.name.ru, dish.description.ru);
  if (hash === dish.sourceHash) return dish;
  const next: Dish = { ...dish, name: { ...dish.name }, description: { ...dish.description }, trStatus: { ...dish.trStatus }, sourceHash: hash };
  for (const lang of TARGET_LOCALES) {
    if (next.trStatus[lang] === "manual") continue;
    const result = await translate([dish.name.ru, dish.description.ru], lang);
    if (result) {
      next.name[lang] = result[0];
      next.description[lang] = result[1];
      next.trStatus[lang] = "auto";
    } else {
      next.trStatus[lang] = "missing";
    }
  }
  return next;
}
