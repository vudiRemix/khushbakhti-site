import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/(admin)/admin/actions";
import { getStore } from "@/lib/store";
import { translatorConfigured } from "@/lib/translate";

type Section = "dishes" | "settings" | "qr";

const NAV: Array<{ id: Section; href: string; label: string }> = [
  { id: "dishes", href: "/admin", label: "Блюда" },
  { id: "settings", href: "/admin/settings", label: "Настройки" },
  { id: "qr", href: "/admin/qr", label: "QR" },
];

export function AdminShell({ active, children }: { active: Section; children: React.ReactNode }) {
  const store = getStore();
  return (
    <div className="flex min-h-dvh flex-col pb-[60px] md:pb-0">
      <header className="no-print bg-ink text-white">
        <div className="mx-auto flex max-w-[1200px] items-center gap-4 px-4 py-2">
          <Link href="/admin" className="flex items-center gap-2.5 text-white no-underline">
            <Image src="/brand/khushbakhti-logo-256.png" alt="" width={56} height={42} className="h-10 w-auto" />
            <span className="sign-text text-[22px]">Админка</span>
          </Link>
          <nav aria-label="Разделы" className="ml-4 hidden gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.id} href={n.href} aria-current={active === n.id ? "page" : undefined}
                className={`px-3 py-2 font-bold no-underline ${active === n.id ? "bg-turq text-white" : "text-white hover:bg-white/10"}`}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <a href="/ru" target="_blank" rel="noopener" className="hidden px-3 py-2 text-white underline md:inline">Открыть сайт</a>
            <form action={logout}>
              <button type="submit" className="min-h-10 border-2 border-white px-3 font-bold text-white">Выйти</button>
            </form>
          </div>
        </div>
      </header>
      {!store.writable ? (
        <p className="m-0 bg-stamp px-4 py-2 text-center font-bold text-white">
          Изменения не сохраняются: хранилище только для чтения. Подключите Supabase — см. docs/DEPLOY.md.
        </p>
      ) : null}
      {!translatorConfigured() ? (
        <p className="no-print m-0 bg-gold px-4 py-1.5 text-center text-[14px]">
          Автоперевод выключен (нет GOOGLE_TRANSLATE_API_KEY): переводы новых блюд вводите вручную.
        </p>
      ) : null}
      <div className="mx-auto w-full max-w-[1200px] flex-1 px-3 py-4 sm:px-4 md:py-6">{children}</div>
      <nav aria-label="Разделы" className="no-print fixed inset-x-0 bottom-0 z-20 flex border-t-[3px] border-ink bg-white md:hidden">
        {NAV.map((n) => (
          <Link key={n.id} href={n.href} aria-current={active === n.id ? "page" : undefined}
            className={`flex min-h-14 flex-1 items-center justify-center font-bold no-underline ${active === n.id ? "bg-turq text-white" : "text-ink"}`}>
            {n.label}
          </Link>
        ))}
        <a href="/ru" target="_blank" rel="noopener" className="flex min-h-14 flex-1 items-center justify-center font-bold text-ink no-underline">Сайт</a>
      </nav>
    </div>
  );
}
