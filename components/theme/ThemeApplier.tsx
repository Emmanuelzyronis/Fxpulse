"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";

/**
 * Applies the persisted theme preference to <html> as the `.dark` class.
 * Waits for hydration so it uses the stored choice, and follows the OS setting
 * live while the preference is "system". A no-flash inline script in the root
 * layout sets the initial class before paint.
 */
export function ThemeApplier() {
  const hydrated = useHasHydrated();
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mql.matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    if (theme === "system") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
  }, [theme, hydrated]);

  return null;
}
