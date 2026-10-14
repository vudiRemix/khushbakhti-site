"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import { money, telHref } from "@/lib/format";
import { buildDeliveryMessage, orderTotal, telegramLink, whatsappLink } from "@/lib/order";
import type { Locale } from "@/lib/types";
import { Pakhta } from "./Pakhta";

export interface ClientDish {
  id: string;
  category: string;
  price: number;
  isNew: boolean;
  available: boolean;
  photo: string | null;
  name: string;
  /** Unreviewed machine translation: shown with a * and a "-x-mtfrom-ru" lang tag. */
  machine: boolean;
  nameRu: string;
  nameTg: string;
}

export interface ClientCategory {
  id: string;
  short: string;
  note?: string;
}

interface Props {
  locale: Locale;
  t: Dictionary["menu"];
  dishes: ClientDish[];
  categories: ClientCategory[];
  phone: string;
  whatsapp: string;
  telegram: string;
  fee: number;
  /** lang tag for machine-translated names, e.g. "en-x-mtfrom-ru". */
  machineLang: string;
}

const PICKS_KEY = "kb_picks_v2";
/** A selection older than this is from an earlier visit and starts empty. */
const PICKS_TTL_MS = 12 * 60 * 60 * 1000;
const ADDR_KEY = "kb_addr_v1";
const TABLE_KEY = "kb_table_v1";

/** Table number from the QR link (?table=N); remembered for this visit so it survives going to the home page and back. */
function readTable(): string | undefined {
  const fromUrl = new URLSearchParams(window.location.search).get("table");
  try {
    if (fromUrl && /^\d{1,3}$/.test(fromUrl)) {
      window.sessionStorage.setItem(TABLE_KEY, fromUrl);
      return fromUrl;
    }
    return window.sessionStorage.getItem(TABLE_KEY) ?? undefined;
  } catch {
    return fromUrl && /^\d{1,3}$/.test(fromUrl) ? fromUrl : undefined;
  }
}

function readPicks(): Record<string, number> {
  const saved = readJson<{ at?: number; picks?: Record<string, number> }>(PICKS_KEY, {});
  return saved.at && Date.now() - saved.at < PICKS_TTL_MS && saved.picks ? saved.picks : {};
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const v = window.localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function MenuClient({ locale, t, dishes, categories, phone, whatsapp, telegram, fee, machineLang }: Props) {
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<"hall" | "delivery">("hall");
  const [addr, setAddr] = useState("");
  const [waiter, setWaiter] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [table, setTable] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [addressError, setAddressError] = useState(false);
  const addressInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTable(readTable());
    if (new URLSearchParams(window.location.search).get("mode") === "delivery") setMode("delivery");
    setPicks(readPicks());
    setAddr(readJson(ADDR_KEY, ""));
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(PICKS_KEY, JSON.stringify({ at: Date.now(), picks }));
      window.localStorage.setItem(ADDR_KEY, JSON.stringify(addr));
    } catch {
      /* private mode: keep state in memory only */
    }
  }, [picks, addr, loaded]);

  const byId = useMemo(() => new Map(dishes.map((d) => [d.id, d])), [dishes]);
  const noteByCat = useMemo(() => new Map(categories.map((c) => [c.id, c.note])), [categories]);

  const query = q.trim().toLowerCase();
  const visible = dishes.filter(
    (d) =>
      (cat === "all" || d.category === cat) &&
      (!query || `${d.name} ${d.nameRu} ${d.nameTg}`.toLowerCase().includes(query)),
  );

  // Picks of dishes that left the menu are dropped; sold-out ones stay visible but are not ordered.
  const picked = Object.entries(picks)
    .map(([id, qty]) => ({ dish: byId.get(id), qty }))
    .filter((p): p is { dish: ClientDish; qty: number } => !!p.dish && p.qty > 0);
  const ordered = picked.filter((p) => p.dish.available);
  const lines = ordered.map((p) => ({ nameRu: p.dish.nameRu, qty: p.qty, priceTjs: p.dish.price }));
  const total = orderTotal(lines);
  const payable = total + (mode === "delivery" && ordered.length ? fee : 0);
  const count = ordered.reduce((n, p) => n + p.qty, 0);
  const message = buildDeliveryMessage({
    lines,
    deliveryFeeTjs: fee,
    address: addr,
    guestLanguage: locale === "ru" ? undefined : t.guestLanguage,
  });

  const setQty = (id: string, qty: number) =>
    setPicks((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });

  const validateAddress = () => {
    if (addr.trim()) return true;
    setAddressError(true);
    addressInput.current?.focus();
    addressInput.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    return false;
  };

  const copyMessage = async () => {
    if (!validateAddress()) return;
    if (await copyText(message)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 4000);
    }
  };

  const openWaiter = () => {
    setWaiter(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (waiter) {
    return (
      <section aria-label="Для официанта" lang="ru" className="mx-auto max-w-[760px] border-[3px] border-outline bg-surface">
        <Pakhta id="pakhta-waiter" height={28} />
        <div className="flex flex-col gap-4 px-5 pb-8 pt-6 sm:px-8">
          <div className="flex flex-col gap-0.5">
            <span className="sign-text text-[18px] text-accent">Для официанта · Барои пешхизмат</span>
            <h2 className="sign-text m-0 text-[44px] leading-none sm:text-[54px]">Гость выбрал</h2>
            <span>
              {table ? `Стол ${table} · ` : ""}
              {locale === "ru" ? "" : `Язык гостя: ${t.guestLanguage}`}
            </span>
          </div>
          <ul className="m-0 list-none border-t-[3px] border-outline p-0">
            {ordered.map(({ dish, qty }) => (
              <li key={dish.id} className="flex items-baseline justify-between gap-4 border-b border-line py-3.5">
                <div className="flex min-w-0 flex-col">
                  <span className="text-[24px] font-bold leading-tight sm:text-[30px]">
                    {dish.nameRu} <span className="text-highlight">× {qty}</span>
                  </span>
                  <span lang="tg" className="text-muted">{dish.nameTg}</span>
                </div>
                <span className="sign-text whitespace-nowrap text-[24px] sm:text-[30px]">{money("ru", dish.price * qty)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between border-t-[3px] border-outline pt-2">
            <span className="text-[20px] font-bold">Итого · Ҳамагӣ</span>
            <span className="sign-text text-[44px] leading-none sm:text-[52px]">{money("ru", total)}</span>
          </div>
          <button type="button" onClick={() => setWaiter(false)} lang={locale} className="btn btn-outline self-start">
            ← {t.back}
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-[260px] flex-[0_1_420px]">
            <label htmlFor="menu-search" className="mb-1 block text-[15px] font-bold">{t.searchLabel}</label>
            <div className="flex min-h-[52px] items-center gap-2.5 border-[3px] border-outline px-3.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-4-4" />
              </svg>
              <input
                id="menu-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.searchPh}
                className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-[18px] outline-none"
              />
            </div>
          </div>
        </div>
        <nav aria-label={t.title} className="-mb-[3px] flex overflow-x-auto">
          {[{ id: "all", short: t.all }, ...categories].map((c) => {
            const on = c.id === cat;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setCat(c.id)}
                className={`sign-text -mr-[3px] min-h-[52px] flex-none whitespace-nowrap border-[3px] px-5 text-[19px] ${
                  on ? "border-turq border-b-turq bg-turq text-white" : "border-outline bg-surface text-foreground hover:bg-wash"
                }`}
              >
                {c.short}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-0 flex flex-wrap items-start gap-9 border-t-[3px] border-outline pt-6">
        <div className="min-w-0 flex-[999_1_600px]">
          {visible.length === 0 ? <p className="m-0 border-[3px] border-dashed border-outline p-6">{t.nothing}</p> : null}
          <div className="grid gap-x-9 lg:grid-cols-2">
            {visible.map((d) => {
              const qty = picks[d.id] ?? 0;
              const note = noteByCat.get(d.category);
              return (
                <article key={d.id} className="flex gap-4 border-b-2 border-outline py-5">
                  {d.photo ? (
                    <Image
                      src={d.photo}
                      alt={d.name}
                      width={264}
                      height={264}
                      sizes="132px"
                      className={`size-[104px] flex-none border-[3px] border-outline object-cover sm:size-[132px] ${d.available ? "" : "opacity-50 grayscale"}`}
                    />
                  ) : (
                    <div className="flex size-[104px] flex-none items-center justify-center border-[3px] border-dashed border-outline bg-wash p-2 text-center text-[14px] text-muted sm:size-[132px]">
                      {t.photoSoon}
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 lang={d.machine ? machineLang : undefined} className={`sign-text m-0 text-[22px] leading-[1.05] sm:text-[26px] ${d.available ? "" : "text-muted line-through"}`}>{d.name}{d.machine ? "*" : ""}</h2>
                      {d.isNew ? <span className="stamp-new">{t.new}</span> : null}
                      {!d.available ? <span className="-rotate-3 border-2 border-outline px-1.5 text-[13px] font-bold uppercase">{t.soldOut}</span> : null}
                    </div>
                    {note ? <p className="m-0 text-[15px] text-muted">{note}</p> : null}
                    <div className="mt-auto flex items-center justify-between gap-3 pt-1.5">
                      <span className="sign-text text-[26px] leading-none sm:text-[30px]">{money(locale, d.price)}</span>
                      <button
                        type="button"
                        disabled={!d.available}
                        onClick={() => setQty(d.id, qty + 1)}
                        aria-label={`${qty ? `${t.more} · ${qty}` : t.add}: ${d.name}`}
                        className={`btn min-h-[46px] px-4 text-[16px] ${
                          !d.available ? "border-line bg-surface text-muted" : qty ? "btn-turq" : "btn-ink"
                        }`}
                      >
                        {qty ? `${t.more} · ${qty}` : t.add}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside id="my-table" aria-labelledby="my-table-title" className="min-w-0 flex-[1_1_340px] scroll-mt-4 border-[3px] border-outline bg-surface lg:sticky lg:top-4">
          <Pakhta id="pakhta-aside" height={22} />
          <div className="flex flex-col gap-3.5 px-5 pb-6 pt-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="my-table-title" className="sign-text m-0 text-[34px] leading-none">{t.myTable}</h2>
              <span className="sign-text text-[26px] text-highlight">{table ? `${t.table} ${table} · ` : ""}{count}</span>
            </div>
            <div role="tablist" aria-label={t.myTable} className="flex">
              {(["hall", "delivery"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={`-mr-0.5 min-h-[46px] flex-1 border-2 border-outline px-2.5 text-[15px] font-bold ${mode === m ? "bg-ink text-white" : "bg-surface text-foreground"}`}
                >
                  {m === "hall" ? t.hall : t.deliveryTab}
                </button>
              ))}
            </div>
            {picked.length === 0 ? <p className="m-0 text-muted">{t.emptyTable}</p> : null}
            <ul className="m-0 list-none p-0">
              {picked.map(({ dish, qty }) => (
                <li key={dish.id} className="flex items-center gap-2.5 border-b border-line py-2.5">
                  <div className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className={`font-bold ${dish.available ? "" : "text-muted line-through"}`}>{dish.name}</span>
                    <span className="text-[15px] text-muted">{dish.available ? `${qty} × ${money(locale, dish.price)}` : t.soldOut}</span>
                  </div>
                  <div className="flex items-center border-2 border-outline">
                    <button type="button" onClick={() => setQty(dish.id, dish.available ? qty - 1 : 0)} aria-label={`${t.remove}: ${dish.name}`} className="size-10 bg-surface text-[20px] font-bold">−</button>
                    <span className="min-w-7 text-center font-bold">{qty}</span>
                    <button type="button" disabled={!dish.available} onClick={() => setQty(dish.id, qty + 1)} aria-label={`${t.addOne}: ${dish.name}`} className="size-10 bg-ink text-[20px] font-bold text-white disabled:bg-line disabled:text-muted">+</button>
                  </div>
                </li>
              ))}
            </ul>
            {picked.length ? (
              <button type="button" onClick={() => setPicks({})} className="self-end text-[15px] font-bold text-highlight underline">
                {t.clear}
              </button>
            ) : null}

            {mode === "hall" ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-bold">{t.total}</span>
                  <span className="sign-text text-[40px] leading-none">{money(locale, total)}</span>
                </div>
                <button type="button" onClick={openWaiter} disabled={!ordered.length} className="btn btn-turq min-h-14 text-[18px] disabled:opacity-50">
                  {t.show}
                </button>
                <p className="m-0 text-[15px] text-muted">{t.hint}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <label htmlFor="delivery-address" className="mb-1 block text-[15px] font-bold">{t.addrLabel}</label>
                  <input
                    ref={addressInput}
                    id="delivery-address"
                    required
                    aria-invalid={addressError}
                    aria-describedby={addressError ? "delivery-address-error" : undefined}
                    type="text"
                    autoComplete="street-address"
                    value={addr}
                    onChange={(e) => { setAddr(e.target.value); setAddressError(false); setCopied(false); }}
                    placeholder={t.addrPh}
                    className={`min-h-12 w-full border-[3px] bg-surface px-3 ${addressError ? "border-gold" : "border-outline"}`}
                  />
                  {addressError ? <p id="delivery-address-error" role="alert" className="mb-0 mt-2 text-[15px] text-highlight">{t.addressRequired}</p> : null}
                </div>
                <div className="flex justify-between text-muted">
                  <span>{t.deliveryFee}</span>
                  <span>{money(locale, fee)}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-bold">{t.total}</span>
                  <span className="sign-text text-[40px] leading-none">{money(locale, payable)}</span>
                </div>
                {ordered.length ? (
                  <div>
                    <span className="mb-1 block text-[15px] font-bold">{t.messageLabel}</span>
                    <p lang="ru" className="m-0 whitespace-pre-line border-2 border-outline bg-wash p-3 text-[14px]">{message}</p>
                  </div>
                ) : null}
                {ordered.length ? (
                  <>
                    <a href={addr.trim() ? whatsappLink(whatsapp, message) : "#delivery-address"} onClick={(e) => { if (!validateAddress()) e.preventDefault(); }} target="_blank" rel="noopener" className="btn btn-turq min-h-[52px]">{t.sendWa}</a>
                    {/* Some Telegram clients open the chat without the text, so it is also copied for pasting. */}
                    <a href={addr.trim() ? telegramLink(telegram, message) : "#delivery-address"} onClick={(e) => { if (!validateAddress()) e.preventDefault(); else void copyMessage(); }} target="_blank" rel="noopener" className="btn btn-outline min-h-[52px]">{t.sendTg}</a>
                    <span className="-mt-1 text-[13px] text-muted">{t.tgHint}</span>
                    <button type="button" onClick={copyMessage} className="self-start text-[15px] font-bold text-foreground underline">
                      {t.copyMessage}
                    </button>
                    <span role="status" className="min-h-5 text-[14px] font-bold text-accent">{copied ? t.copied : ""}</span>
                  </>
                ) : null}
                <a href={telHref(phone)} className="btn btn-burgundy min-h-[52px]">{t.callOrder}</a>
                <p className="m-0 text-[14px] text-muted">{t.confirmationNote}</p>
                <p className="m-0 text-[14px] text-muted">{t.noMinimum}</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {count > 0 ? (
        <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex border-t-[3px] border-outline sm:-mx-6 lg:hidden">
          <div className="flex flex-1 items-baseline justify-between bg-turq px-4 py-2 text-white">
            <span className="text-[14px]">{mode === "delivery" ? t.withDelivery : t.myTable} · {count}</span>
            <span className="sign-text text-[26px]" aria-live="polite">{money(locale, payable)}</span>
          </div>
          <a href="#my-table" className="flex items-center bg-ink px-4 font-bold text-white no-underline">{t.myTable} ↓</a>
        </div>
      ) : null}
    </>
  );
}
