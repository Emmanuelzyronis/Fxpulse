import { create } from "zustand";
import { persist } from "zustand/middleware";
import { jsonStorage } from "@/lib/storage/persist";
import { newId } from "@/lib/id";
import type { LogEntry } from "@/types/log";

/** Ring-buffered conversion history (newest first). */
const MAX_ENTRIES = 1000;

interface LogState {
  entries: LogEntry[];
  log: (entry: Omit<LogEntry, "id" | "at"> & { at?: number }) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useLogStore = create<LogState>()(
  persist(
    (set) => ({
      entries: [],
      log: (entry) =>
        set((s) => {
          const full: LogEntry = { ...entry, id: newId(), at: entry.at ?? Date.now() };
          const next = [full, ...s.entries];
          return { entries: next.length > MAX_ENTRIES ? next.slice(0, MAX_ENTRIES) : next };
        }),
      remove: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: "fxpulse:log",
      version: 1,
      storage: jsonStorage,
      skipHydration: true,
    },
  ),
);
