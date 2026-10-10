"use client";

import Link from "next/link";

/** Any failure inside the admin (no connection, paused database) ends here instead of a blank English error. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-[560px] flex-col gap-4 px-4 py-12">
      <h1 className="sign-text m-0 text-[32px] leading-none">Что-то пошло не так</h1>
      <p className="m-0">
        Не удалось выполнить действие. Чаще всего это пропавший интернет или база Supabase на паузе (см. docs/DEPLOY.md, «Если что-то не работает»).
        Проверьте связь и попробуйте ещё раз.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={reset} className="btn btn-ink">Попробовать ещё раз</button>
        <Link href="/admin" className="btn btn-outline">К списку блюд</Link>
      </div>
      {error.digest ? <p className="m-0 text-[13px] text-muted">Код ошибки для разработчика: {error.digest}</p> : null}
    </main>
  );
}
