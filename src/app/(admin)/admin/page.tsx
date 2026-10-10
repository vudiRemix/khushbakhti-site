import Image from "next/image";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import { getMenu } from "@/lib/store";
import { TARGET_LOCALES } from "@/lib/types";
import { togglePlov, toggleAvailable } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await requireAdmin();
  const { deleted } = await searchParams;
  const { categories, dishes, settings } = await getMenu();
  const review = dishes.filter((d) => TARGET_LOCALES.some((l) => d.trStatus[l] === "auto" || d.trStatus[l] === "missing"));
  const soldOut = dishes.filter((d) => !d.available).length;

  return (
    <AdminShell active="dishes">
      {deleted ? <p role="status" className="mb-4 border-2 border-turq bg-white p-3">Блюдо удалено.</p> : null}
      <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
        <form action={togglePlov} className="flex items-center justify-between gap-3 border-8 border-wood bg-board px-4 py-3 text-chalk">
          <div>
            <p className="m-0 font-[family-name:var(--font-chalk)] text-[30px] leading-none text-gold">Плов сегодня</p>
            <p className="m-0 font-bold">{settings.plovToday ? "есть — гости видят «есть»" : "закончился — гости видят «закончился»"}</p>
          </div>
          <SubmitButton role="switch" aria-checked={settings.plovToday} aria-label="Плов сегодня есть" pendingText="…"
            className={`relative h-10 w-[72px] flex-none border-2 border-chalk ${settings.plovToday ? "bg-gold" : "bg-board"}`}>
            <span aria-hidden="true" className={`absolute top-1 size-7 transition-[left] ${settings.plovToday ? "left-[38px] bg-ink" : "left-1 bg-chalk"}`} />
          </SubmitButton>
        </form>
        <div className="border-2 border-ink bg-white px-4 py-3">
          <p className="m-0 text-[14px] text-muted">Нет в наличии</p>
          <p className="sign-text m-0 text-[44px] leading-none">{soldOut}</p>
        </div>
        <div className="border-2 border-ink bg-white px-4 py-3">
          <p className="m-0 text-[14px] text-muted">Переводы ждут проверки</p>
          <p className="sign-text m-0 text-[44px] leading-none text-burgundy">{review.length}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <h1 className="sign-text m-0 text-[36px] leading-none">Блюда</h1>
        <Link href="/admin/dishes/new" className="btn btn-ink">+ Новое блюдо</Link>
      </div>
      <p className="mb-3 mt-1 text-[15px] text-muted">Нажмите переключатель, чтобы отметить «закончилось». Нажмите на блюдо, чтобы изменить цену, фото или перевод.</p>

      {categories.map((c) => {
        const items = dishes.filter((d) => d.category === c.id);
        if (!items.length) return null;
        return (
          <section key={c.id} className="mb-5">
            <h2 className="sign-text m-0 mb-1 text-[22px] text-turq">{c.name.ru}</h2>
            <ul className="m-0 list-none border-2 border-ink bg-white p-0">
              {items.map((d) => {
                const needsReview = TARGET_LOCALES.filter((l) => d.trStatus[l] === "auto" || d.trStatus[l] === "missing");
                return (
                  <li key={d.id} className={`flex items-center gap-3 border-b border-line px-2.5 py-2 last:border-b-0 ${d.available ? "" : "opacity-60"}`}>
                    <Link href={`/admin/dishes/${d.id}`} className="flex min-w-0 flex-1 items-center gap-3 text-ink no-underline">
                      {d.photo ? (
                        <Image src={d.photo} alt="" width={88} height={88} className="size-11 flex-none border-2 border-ink object-cover" />
                      ) : (
                        <span className="size-11 flex-none border-2 border-dashed border-ink bg-wash" />
                      )}
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="font-bold">{d.name.ru}</span>
                        <span className="text-[14px] text-muted">
                          {d.priceTjs} смн · {d.available ? "в наличии" : "закончилось"}
                          {d.isNew ? " · новинка" : ""}
                          {needsReview.length ? ` · проверить: ${needsReview.map((l) => l.toUpperCase()).join(", ")}` : ""}
                        </span>
                      </span>
                    </Link>
                    <form action={toggleAvailable}>
                      <input type="hidden" name="id" value={d.id} />
                      <SubmitButton role="switch" aria-checked={d.available} aria-label={`В наличии: ${d.name.ru}`} pendingText="…"
                        className={`relative h-8 w-14 flex-none border-2 border-ink ${d.available ? "bg-turq" : "bg-white"}`}>
                        <span aria-hidden="true" className={`absolute top-1 size-5 ${d.available ? "left-7 bg-white" : "left-1 bg-ink"}`} />
                      </SubmitButton>
                    </form>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </AdminShell>
  );
}
