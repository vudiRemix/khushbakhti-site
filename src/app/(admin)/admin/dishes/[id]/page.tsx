import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { PhotoInput } from "@/components/admin/PhotoInput";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import { getMenu } from "@/lib/store";
import { TARGET_LOCALES, type Dish, type TargetLocale, type TrStatus } from "@/lib/types";
import { deleteDish, markChecked, retranslate, saveDish } from "../../actions";

export const dynamic = "force-dynamic";

const LANG_NAME: Record<TargetLocale, string> = { tg: "Таджикский", en: "Английский", zh: "Китайский" };
const STATUS: Record<TrStatus, { text: string; cls: string }> = {
  checked: { text: "Проверено", cls: "bg-turq text-white" },
  auto: { text: "Автоперевод · нужна проверка", cls: "bg-gold text-ink" },
  manual: { text: "Исправлено вручную", cls: "bg-pakhta text-white" },
  missing: { text: "Нет перевода", cls: "bg-stamp text-white" },
};

const field = "min-h-12 w-full border-[3px] border-ink bg-white px-3";

export default async function DishEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { saved, error } = await searchParams;
  const { categories, dishes } = await getMenu();
  const isNew = id === "new";
  const dish: Dish | undefined = isNew ? undefined : dishes.find((d) => d.id === id);
  if (!isNew && !dish) notFound();

  return (
    <AdminShell active="dishes">
      <Link href="/admin" className="font-bold text-ink">← Все блюда</Link>
      <h1 className="sign-text mb-3 mt-2 text-[34px] leading-none">{dish ? dish.name.ru : "Новое блюдо"}</h1>
      {saved ? <p role="status" className="mb-3 border-2 border-turq bg-white p-3 font-bold">Сохранено. Сайт обновится в течение минуты.</p> : null}
      {error ? <p role="alert" className="mb-3 border-2 border-stamp bg-white p-3 font-bold text-stamp">{error}</p> : null}

      <form action={saveDish} className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <input type="hidden" name="id" value={dish?.id ?? ""} />

        <fieldset className="m-0 flex flex-col gap-4 border-[3px] border-ink bg-white p-4">
          <legend className="px-1 font-bold">Основное · исходный язык — русский</legend>
          <div>
            <label htmlFor="name_ru" className="mb-1 block font-bold">Название</label>
            <input id="name_ru" name="name_ru" required defaultValue={dish?.name.ru} className={field} />
          </div>
          <div>
            <label htmlFor="desc_ru" className="mb-1 block font-bold">Описание <span className="font-normal text-muted">(необязательно)</span></label>
            <textarea id="desc_ru" name="desc_ru" rows={3} defaultValue={dish?.description.ru} className={`${field} py-2`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="price" className="mb-1 block font-bold">Цена, смн</label>
              <input id="price" name="price" type="number" inputMode="numeric" min={0} step={1} required defaultValue={dish?.priceTjs} className={field} />
            </div>
            <div>
              <label htmlFor="category" className="mb-1 block font-bold">Категория</label>
              <select id="category" name="category" defaultValue={dish?.category ?? categories[0]?.id} className={field}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name.ru}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex min-h-11 items-center gap-2 font-bold">
              <input type="checkbox" name="available" defaultChecked={dish?.available ?? true} className="size-5 accent-turq" /> В наличии
            </label>
            <label className="flex min-h-11 items-center gap-2 font-bold">
              <input type="checkbox" name="is_new" defaultChecked={dish?.isNew} className="size-5 accent-stamp" /> Новинка
            </label>
            <label className="flex min-h-11 items-center gap-2 font-bold">
              <input type="checkbox" name="featured" defaultChecked={dish?.featured} className="size-5 accent-burgundy" /> На главной
            </label>
          </div>

          <div className="flex flex-col gap-2 border-t-2 border-line pt-3">
            <span className="font-bold">Фото</span>
            {dish?.photo ? (
              <div className="flex items-center gap-3">
                <Image src={dish.photo} alt="" width={240} height={240} className="size-28 border-[3px] border-ink object-cover" />
                <div className="text-[14px] text-muted">
                  {dish.photoCredit ? <>Временное фото: {dish.photoCredit.author}, {dish.photoCredit.license}. Загрузите своё.</> : "Своё фото ресторана."}
                  <label className="mt-2 flex items-center gap-2 font-bold text-ink">
                    <input type="checkbox" name="remove_photo" className="size-5" /> Убрать фото
                  </label>
                </div>
              </div>
            ) : (
              <p className="m-0 text-[14px] text-muted">Фото нет — на сайте будет «фото скоро».</p>
            )}
            <PhotoInput
              label={<>{dish?.photo ? "Заменить фото" : "Добавить фото"} <span className="font-normal text-muted">(с телефона можно сразу снять)</span></>}
              className="min-h-12 w-full border-[3px] border-dashed border-ink bg-wash p-2 text-[15px] file:mr-3 file:border-0 file:bg-ink file:px-3 file:py-2 file:font-bold file:text-white"
            />
            <span className="text-[13px] text-muted">Фото обрежется до квадрата и сожмётся автоматически.</span>
          </div>
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-4 border-[3px] border-ink bg-white p-4">
          <legend className="px-1 font-bold">Переводы</legend>
          <p className="m-0 text-[14px] text-muted">
            При сохранении, если русский текст изменился, переводы обновятся автоматически. Исправленные вручную не перезаписываются.
          </p>
          {TARGET_LOCALES.map((lang) => {
            const status = dish ? STATUS[dish.trStatus[lang]] : STATUS.missing;
            return (
              <div key={lang} id={`tr-${lang}`} className="flex scroll-mt-4 flex-col gap-2 border-2 border-ink p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold">{LANG_NAME[lang]}</span>
                  <span className={`px-2 py-0.5 text-[13px] font-bold ${status.cls}`}>{status.text}</span>
                </div>
                <label className="sr-only" htmlFor={`name_${lang}`}>Название — {LANG_NAME[lang]}</label>
                <input id={`name_${lang}`} name={`name_${lang}`} defaultValue={dish?.name[lang]} lang={lang === "zh" ? "zh-Hans" : lang} className={field} placeholder="Название" />
                <label className="sr-only" htmlFor={`desc_${lang}`}>Описание — {LANG_NAME[lang]}</label>
                <textarea id={`desc_${lang}`} name={`desc_${lang}`} rows={2} defaultValue={dish?.description[lang]} lang={lang === "zh" ? "zh-Hans" : lang} className={`${field} py-2`} placeholder="Описание" />
                {dish ? (
                  <div className="flex flex-wrap gap-2">
                    {dish.trStatus[lang] !== "checked" ? (
                      <button type="submit" formAction={markChecked} name="lang" value={lang} className="btn btn-outline min-h-10 border-turq px-3 text-[14px] text-turq">
                        Отметить «проверено»
                      </button>
                    ) : null}
                    <button type="submit" formAction={retranslate} name="lang" value={lang} className="btn btn-outline min-h-10 px-3 text-[14px]">
                      Перевести заново
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </fieldset>

        <div className="sticky bottom-[60px] z-10 -mx-3 border-t-[3px] border-ink bg-white p-3 md:bottom-0 lg:col-span-2 lg:mx-0 lg:border-[3px]">
          <SubmitButton className="btn btn-burgundy min-h-[52px] w-full text-[17px]" pendingText="Сохраняю и перевожу…">
            Сохранить и перевести
          </SubmitButton>
        </div>
      </form>

      {dish ? (
        <details className="mt-8 border-2 border-stamp bg-white p-3">
          <summary className="cursor-pointer font-bold text-stamp">Удалить блюдо</summary>
          <form action={deleteDish} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="id" value={dish.id} />
            <p className="m-0">Блюдо «{dish.name.ru}» исчезнет из меню на всех языках. Это нельзя отменить.</p>
            <SubmitButton className="btn min-h-11 self-start bg-stamp text-white" pendingText="Удаляю…">Да, удалить</SubmitButton>
          </form>
        </details>
      ) : null}
    </AdminShell>
  );
}
