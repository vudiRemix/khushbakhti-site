import Image from "next/image";
import QRCode from "qrcode";
import { AdminShell } from "@/components/admin/AdminShell";
import { PrintButton } from "@/components/admin/PrintButton";
import { requireAdmin } from "@/lib/auth";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function QrPage({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  await requireAdmin();
  const { n } = await searchParams;
  const count = Math.min(60, Math.max(1, Number(n) || 12));
  const base = siteUrl();
  const codes = await Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const url = `${base}/t/${i + 1}`;
      // Generated locally from our own URL, so inlining the SVG is safe.
      const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#141414", light: "#FFFFFF" } });
      return { table: i + 1, url, svg };
    }),
  );
  return (
    <AdminShell active="qr">
      <div className="no-print mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="sign-text m-0 text-[34px] leading-none">QR-коды столов</h1>
          <p className="m-0 mt-1 max-w-[640px] text-[15px] text-muted">
            Гость сканирует код — меню открывается на языке его телефона, а в «Моём столе» уже стоит номер стола. Распечатайте и поставьте на столы.
          </p>
        </div>
        <form className="flex items-end gap-2">
          <div>
            <label htmlFor="n" className="mb-1 block font-bold">Столов</label>
            <input id="n" name="n" type="number" min={1} max={60} defaultValue={count} className="min-h-12 w-24 border-[3px] border-ink px-3" />
          </div>
          <button type="submit" className="btn btn-outline">Показать</button>
          <PrintButton className="btn btn-ink" />
        </form>
      </div>
      {base.startsWith("http://localhost") ? (
        <p className="no-print mb-4 border-2 border-stamp bg-white p-3">Адрес сайта не задан (SITE_URL), коды ведут на localhost. Задайте SITE_URL перед печатью.</p>
      ) : null}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 print:grid-cols-3 print:gap-6">
        {codes.map((c) => (
          <figure key={c.table} className="m-0 flex break-inside-avoid flex-col items-center gap-2 border-[3px] border-ink bg-white p-4 text-center">
            <Image src="/brand/khushbakhti-logo-256.png" alt="Хушбахти" width={120} height={91} className="h-14 w-auto" />
            <span className="sign-text text-[28px] leading-none">Стол {c.table}</span>
            <div className="w-full max-w-[220px] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: c.svg }} />
            <figcaption className="text-[14px] font-bold leading-tight">
              Меню · Menu · <span lang="zh-Hans">菜单</span>
              <br />
              <span className="font-normal text-muted">{c.url.replace(/^https?:\/\//, "")}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </AdminShell>
  );
}
