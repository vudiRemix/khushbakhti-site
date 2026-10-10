import { Caveat, Noto_Sans_SC, PT_Sans, ZCOOL_KuaiLe } from "next/font/google";
import localFont from "next/font/local";

/** Our own display font, drawn after the logo lettering (scripts/build_font.py). */
export const sign = localFont({
  src: "../../public/fonts/KhushbakhtiSign.woff2",
  variable: "--font-khushbakhti",
  display: "swap",
  weight: "400",
});

export const ptSans = PT_Sans({
  weight: ["400", "700"],
  subsets: ["cyrillic", "cyrillic-ext", "latin", "latin-ext"],
  variable: "--font-ptsans",
  display: "swap",
});

export const caveat = Caveat({
  weight: ["700"],
  subsets: ["cyrillic", "latin"],
  variable: "--font-caveat",
  display: "swap",
});

/* Chinese: browsers download only the slices with characters on the page (unicode-range). */
export const notoSC = Noto_Sans_SC({
  weight: ["400", "700"],
  preload: false,
  variable: "--font-notosc",
  display: "swap",
});

export const zcool = ZCOOL_KuaiLe({
  weight: "400",
  preload: false,
  variable: "--font-zcool",
  display: "swap",
});

export const fontVariables = [sign, ptSans, caveat, notoSC, zcool].map((f) => f.variable).join(" ");
