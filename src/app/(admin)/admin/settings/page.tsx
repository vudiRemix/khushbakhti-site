import { AdminShell } from "@/components/admin/AdminShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import { getMenu } from "@/lib/store";
import { saveSettings } from "../actions";

export const dynamic = "force-dynamic";

const field = "min-h-12 w-full border-[3px] border-ink bg-white px-3";

function Field({ id, label, hint, ...rest }: { id: string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-bold">{label}</label>
      <input id={id} name={id} className={field} {...rest} />
      {hint ? <span className="mt-1 block text-[13px] text-muted">{hint}</span> : null}
    </div>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const { saved } = await searchParams;
  const { settings: s } = await getMenu();
  return (
    <AdminShell active="settings">
      <h1 className="sign-text mb-3 mt-0 text-[34px] leading-none">Настройки</h1>
      {saved ? <p role="status" className="mb-3 border-2 border-turq bg-white p-3 font-bold">Сохранено.</p> : null}
      <form action={saveSettings} className="grid gap-5 lg:grid-cols-2">
        <fieldset className="m-0 flex flex-col gap-4 border-[3px] border-ink bg-white p-4">
          <legend className="px-1 font-bold">Работа и доставка</legend>
          <label className="flex min-h-11 items-center gap-2 font-bold">
            <input type="checkbox" name="plov_today" defaultChecked={s.plovToday} className="size-5 accent-turq" /> Плов сегодня есть
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field id="hours_open" label="Открытие" type="time" defaultValue={s.hoursOpen} required />
            <Field id="hours_close" label="Закрытие" type="time" defaultValue={s.hoursClose} required />
          </div>
          <Field id="delivery_fee" label="Доставка по городу, смн" type="number" inputMode="numeric" min={0} defaultValue={s.deliveryFeeTjs} required />
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-4 border-[3px] border-ink bg-white p-4">
          <legend className="px-1 font-bold">Связь</legend>
          <Field id="phone" label="Телефон" type="tel" defaultValue={s.phone} required />
          <Field id="whatsapp" label="WhatsApp" type="tel" defaultValue={s.whatsapp} hint="Номер с кодом страны, например 992929910009" />
          <Field id="telegram" label="Telegram" defaultValue={s.telegram} hint="Имя без @, например Khushbakhti_family" />
          <Field id="instagram" label="Instagram" defaultValue={s.instagram} />
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-4 border-[3px] border-ink bg-white p-4 lg:col-span-2">
          <legend className="px-1 font-bold">Адрес и карта</legend>
          <div className="grid gap-3 md:grid-cols-2">
            <Field id="address_ru" label="Адрес — русский" defaultValue={s.address.ru} />
            <Field id="address_tg" label="Адрес — таджикский" defaultValue={s.address.tg} lang="tg" />
            <Field id="address_en" label="Адрес — английский" defaultValue={s.address.en} lang="en" />
            <Field id="address_zh" label="Адрес — китайский" defaultValue={s.address.zh} lang="zh-Hans" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field id="lat" label="Широта" defaultValue={String(s.lat)} inputMode="decimal" />
            <Field id="lon" label="Долгота" defaultValue={String(s.lon)} inputMode="decimal" />
            <Field id="google_maps" label="Ссылка Google Maps" type="url" defaultValue={s.googleMapsUrl} />
          </div>
        </fieldset>

        <div className="sticky bottom-[60px] z-10 -mx-3 border-t-[3px] border-ink bg-white p-3 md:bottom-0 lg:col-span-2 lg:mx-0 lg:border-[3px]">
          <SubmitButton className="btn btn-burgundy min-h-[52px] w-full">Сохранить настройки</SubmitButton>
        </div>
      </form>
    </AdminShell>
  );
}
