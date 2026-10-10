import Image from "next/image";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { adminPassword, isAdmin } from "@/lib/auth";
import { login } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;
  const configured = !!adminPassword();
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form action={login} className="flex w-full max-w-[380px] flex-col gap-4 border-[3px] border-ink bg-white p-6">
        <Image src="/brand/khushbakhti-logo-256.png" alt="Хушбахти" width={160} height={121} className="mx-auto h-auto w-[140px]" priority />
        <h1 className="sign-text m-0 text-center text-[32px]">Вход в админку</h1>
        {!configured ? (
          <p role="alert" className="m-0 border-2 border-stamp p-3 text-[15px]">
            Пароль не задан. Укажите переменную ADMIN_PASSWORD в настройках хостинга (см. docs/DEPLOY.md).
          </p>
        ) : null}
        {error ? <p role="alert" className="m-0 border-2 border-stamp p-3 font-bold text-stamp">Неверный пароль</p> : null}
        <div>
          <label htmlFor="password" className="mb-1 block font-bold">Пароль</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" autoFocus
            className="min-h-12 w-full border-[3px] border-ink px-3" />
        </div>
        <SubmitButton className="btn btn-ink min-h-[52px]" pendingText="Проверяю…" disabled={!configured}>Войти</SubmitButton>
      </form>
    </main>
  );
}
