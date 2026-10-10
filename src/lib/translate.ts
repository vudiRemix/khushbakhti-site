import { sourceHash } from "./hash";
import { TARGET_LOCALES, type Dish, type TargetLocale } from "./types";

/**
 * Dish names that machine translation tends to mangle. Each Russian term is swapped for the
 * target-language form inside a no-translate span before the text goes to the translator.
 * `ru` is a regex: declinable words list their case endings («плова», «шурпой»); indeclinable ones match
 * exactly (so «табака» never catches «табак»).
 */
export const GLOSSARY: Array<{ ru: string; tg: string; en: string; zh: string }> = [
  { ru: "плов(?:а|у|ом|е|ы)?", tg: "палов", en: "plov", zh: "抓饭" },
  { ru: "девзир(?:а|ы|у|ой|е)", tg: "девзира", en: "devzira", zh: "德夫兹拉" },
  { ru: "кенча", tg: "кенча", en: "kencha", zh: "肯恰" },
  { ru: "шурп(?:а|ы|у|ой|ою|е)", tg: "шӯрбо", en: "shurpa", zh: "肉汤" },
  { ru: "лагман(?:а|у|ом|е|ы|ов)?", tg: "лағмон", en: "lagman", zh: "拉条子" },
  { ru: "кавурдок(?:а|у|ом|е)?", tg: "қовурдоқ", en: "kavurdak", zh: "卡乌尔达克" },
  { ru: "чазза", tg: "чазза", en: "chazza", zh: "恰扎" },
  { ru: "мошпиёб(?:а|ы|у|ой|е)", tg: "мошпиёба", en: "moshpiyoba", zh: "绿豆汤" },
  { ru: "табака", tg: "табака", en: "tabaka", zh: "塔巴卡" },
  { ru: "хушбахти", tg: "Хушбахтӣ", en: "Khushbakhti", zh: "Khushbakhti" },
];

const API_LANG: Record<TargetLocale, string> = { tg: "tg", en: "en", zh: "zh-CN" };

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function decodeHtml(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
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
      return `${pre}<span translate="no" class="notranslate">${out}</span>`;
    });
  }
  return html;
}

export function unprotect(html: string): string {
  return decodeHtml(html.replace(/<span\b[^>]*>([\s\S]*?)<\/span>/g, "$1")).replace(/\s+/g, " ").trim();
}

export function translatorConfigured(): boolean {
  return !!process.env.GOOGLE_TRANSLATE_API_KEY;
}

/**
 * Google Cloud Translation v2 (Basic). Returns null when no key is configured or the call fails
 * (network, quota, billing), so saving a dish never breaks because of the translator.
 * Empty strings are not sent: Google bills every request character, even for an empty text.
 */
export async function translateTexts(texts: string[], target: TargetLocale): Promise<string[] | null> {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) return null;
  const trimmed = texts.map((t) => t.trim());
  const toSend = trimmed.filter(Boolean);
  if (!toSend.length) return texts.map(() => "");
  try {
    const res = await fetch("https://translation.googleapis.com/language/translate/v2", {
      method: "POST",
      // The key goes in a header, not the URL, so it never lands in proxy or access logs.
      headers: { "Content-Type": "application/json", "X-goog-api-key": key },
      body: JSON.stringify({
        q: toSend.map((t) => protectTerms(t, target)),
        source: "ru",
        target: API_LANG[target],
        format: "html",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("Translate API error", res.status, await res.text().catch(() => ""));
      return null;
    }
    const json = (await res.json()) as { data: { translations: Array<{ translatedText: string }> } };
    const out = json.data.translations.map((t) => unprotect(t.translatedText));
    let i = 0;
    return trimmed.map((t) => (t ? (out[i++] ?? "") : ""));
  } catch (error) {
    console.error("Translate API unreachable", error);
    return null;
  }
}

/**
 * Bring a dish's translations up to date. Languages are (re)translated when the Russian text changed
 * or an earlier attempt failed ("missing"). Hand-written translations are never overwritten: if the Russian
 * text changes under them they become "stale" so the admin knows to look. Languages typed in this very save
 * (editedNow) count as up to date.
 */
export async function refreshTranslations(
  dish: Dish,
  { translate = translateTexts, editedNow = new Set<TargetLocale>() }: { translate?: typeof translateTexts; editedNow?: Set<TargetLocale> } = {},
): Promise<Dish> {
  const hash = sourceHash(dish.name.ru, dish.description.ru);
  const changed = hash !== dish.sourceHash;
  const handWritten = (l: TargetLocale) => editedNow.has(l) || dish.trStatus[l] === "manual" || dish.trStatus[l] === "stale";
  const todo = TARGET_LOCALES.filter((l) => !handWritten(l) && (changed || dish.trStatus[l] === "missing"));
  if (!changed && !todo.length) return dish;

  const next: Dish = { ...dish, name: { ...dish.name }, description: { ...dish.description }, trStatus: { ...dish.trStatus }, sourceHash: hash };
  if (changed) {
    for (const l of TARGET_LOCALES) if (!editedNow.has(l) && dish.trStatus[l] === "manual") next.trStatus[l] = "stale";
  }
  // In parallel, so a slow translator costs one timeout rather than three.
  const results = await Promise.all(todo.map((l) => translate([dish.name.ru, dish.description.ru], l)));
  todo.forEach((l, i) => {
    const result = results[i];
    if (result) {
      next.name[l] = result[0];
      next.description[l] = result[1];
      next.trStatus[l] = "auto";
    } else {
      // Old text (if any) stays visible; the admin sees «Русский текст изменён» and the next save retries.
      next.trStatus[l] = "missing";
    }
  });
  return next;
}
