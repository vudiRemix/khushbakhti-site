"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "kb_theme";

export function ThemeToggle({ lightLabel, darkLabel }: { lightLabel: string; darkLabel: string }) {
  const [dark, setDark] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const sync = () => {
      let preference: string | null = null;
      try { preference = localStorage.getItem(STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
      const theme = preference === "light" || preference === "dark"
        ? preference
        : document.documentElement.dataset.theme || "light";
      apply(theme === "dark");
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        document.documentElement.dataset.theme = "light";
        sync();
      }
    };
    function apply(isDark: boolean) {
      document.documentElement.dataset.theme = isDark ? "dark" : "light";
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isDark ? "#171918" : "#ffffff");
      setDark(isDark);
    }
    sync();
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, [pathname]);

  const toggle = () => {
    const next = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = next ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next ? "#171918" : "#ffffff");
    setDark(next);
    try { localStorage.setItem(STORAGE_KEY, next ? "dark" : "light"); } catch { /* Keep the selection for this page. */ }
  };

  return (
    <button type="button" onClick={toggle} aria-label={dark ? lightLabel : darkLabel} title={dark ? lightLabel : darkLabel}
      className="ml-auto flex size-11 shrink-0 items-center justify-center border-2 border-outline bg-surface text-foreground hover:bg-wash md:ml-0">
      <svg className="theme-sun" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </svg>
      <svg className="theme-moon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />
      </svg>
    </button>
  );
}
