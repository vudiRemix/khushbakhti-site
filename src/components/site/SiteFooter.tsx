import Link from "next/link";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { Pakhta } from "./Pakhta";

export function SiteFooter({ locale, t, city }: { locale: Locale; t: Dictionary["common"]; city: string }) {
  return (
    <footer>
      <Pakhta id="pakhta-footer" height={24} />
      <div className="bg-burgundy px-4 py-10 text-cream sm:px-6">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[15px]">
          <span className="sign-text text-[26px] text-gold">Хушбахтӣ</span>
          <span>
            © {new Date().getFullYear()} · {city} · {t.photoNote} ·{" "}
            <Link href={`/${locale}/credits`} className="text-cream underline">
              {t.credits}
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
