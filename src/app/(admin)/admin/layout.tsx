import type { Metadata, Viewport } from "next";
import { fontVariables } from "../../fonts";
import "../../globals.css";

export const metadata: Metadata = {
  title: "Админка — Хушбахти",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#141414", width: "device-width", initialScale: 1 };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={fontVariables}>
      <body className="bg-[#F4F5F3]">{children}</body>
    </html>
  );
}
