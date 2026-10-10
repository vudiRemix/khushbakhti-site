import { NextResponse, type NextRequest } from "next/server";
import { detectLocale } from "@/lib/locale-detect";
import { isLocale } from "@/lib/types";

/** Table QR codes point here: /t/5 → /<guest's language>/menu?table=5 */
export function GET(request: NextRequest, { params }: { params: Promise<{ table: string }> }) {
  return params.then(({ table }) => {
    const saved = request.cookies.get("kb_lang")?.value;
    const locale = isLocale(saved) ? saved : detectLocale(request.headers.get("accept-language"));
    const url = new URL(`/${locale}/menu`, request.url);
    if (/^\d{1,3}$/.test(table)) url.searchParams.set("table", table);
    return NextResponse.redirect(url, 307);
  });
}
