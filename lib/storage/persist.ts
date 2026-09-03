import { createJSONStorage, type StateStorage } from "zustand/middleware";

/**
 * A localStorage-backed storage that never throws: it guards against SSR (no
 * window), private-mode/quota errors, and disabled storage. Reads return null
 * on failure; writes are best-effort. This keeps persisted Zustand stores from
 * crashing the app in hostile environments.
 */
const memoryFallback = new Map<string, string>();

export const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(name);
    } catch {
      return memoryFallback.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(name, value);
    } catch {
      memoryFallback.set(name, value);
    }
  },
  removeItem: (name) => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(name);
    } catch {
      memoryFallback.delete(name);
    }
  },
};

/** JSON storage wrapper for Zustand's persist middleware. */
export const jsonStorage = createJSONStorage(() => safeStorage);
