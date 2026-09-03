import { create } from "zustand";
import { persist } from "zustand/middleware";
import { jsonStorage } from "@/lib/storage/persist";
import { AUTO_PRECISION, type Settings, type ThemePref } from "@/types/settings";

interface SettingsState extends Settings {
  setBase: (id: string) => void;
  setQuote: (id: string) => void;
  swap: () => void;
  setPrecision: (precision: number) => void;
  setTheme: (theme: ThemePref) => void;
  setAlertIntervalSec: (sec: number) => void;
  setNotifyEnabled: (enabled: boolean) => void;
}

const DEFAULTS: Settings = {
  baseId: "fiat:USD",
  quoteId: "fiat:EUR",
  precision: AUTO_PRECISION,
  theme: "system",
  alertIntervalSec: 60,
  notifyEnabled: false,
};

/** Minimum poll interval — protects upstream rate limits. */
const MIN_ALERT_INTERVAL = 30;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setBase: (baseId) => set({ baseId }),
      setQuote: (quoteId) => set({ quoteId }),
      swap: () => set((s) => ({ baseId: s.quoteId, quoteId: s.baseId })),
      setPrecision: (precision) => set({ precision }),
      setTheme: (theme) => set({ theme }),
      setAlertIntervalSec: (sec) =>
        set({ alertIntervalSec: Math.max(MIN_ALERT_INTERVAL, Math.floor(sec) || MIN_ALERT_INTERVAL) }),
      setNotifyEnabled: (notifyEnabled) => set({ notifyEnabled }),
    }),
    {
      name: "fxpulse:settings",
      version: 1,
      storage: jsonStorage,
      skipHydration: true,
    },
  ),
);
