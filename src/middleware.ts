import { NextResponse, type NextRequest } from "next/server";
import { detectLocale } from "./lib/locale-detect";
import { isLocale } from "./lib/types";

/** Sends visitors without a language prefix to /<their language>/…, remembering an explicit choice. */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1];
  if (isLocale(first)) {
    const response = NextResponse.next();
    if (request.cookies.get("kb_lang")?.value !== first) {
      response.cookies.set("kb_lang", first, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    return response;
  }
  const saved = request.cookies.get("kb_lang")?.value;
  const locale = isLocale(saved) ? saved : detectLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except admin, the QR redirect, Next internals, API routes and files with an extension.
  matcher: ["/((?!admin|t/|api|_next|.*\\..*).*)"],
};
