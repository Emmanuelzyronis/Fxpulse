import { create } from "zustand";
import { persist } from "zustand/middleware";
import { jsonStorage } from "@/lib/storage/persist";
import { pairId } from "@/lib/assets/ids";
import type { FavoritePair } from "@/types/favorites";

interface FavoritesState {
  pairs: FavoritePair[];
  add: (from: string, to: string) => void;
  remove: (id: string) => void;
  toggle: (from: string, to: string) => void;
  has: (from: string, to: string) => boolean;
  /** Reorder by moving the item at `fromIndex` to `toIndex` (drag-and-drop). */
  reorder: (fromIndex: number, toIndex: number) => void;
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = arr.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      pairs: [],
      add: (from, to) =>
        set((s) => {
          const id = pairId(from, to);
          if (s.pairs.some((p) => p.id === id)) return s;
          return { pairs: [...s.pairs, { id, from, to, createdAt: Date.now() }] };
        }),
      remove: (id) => set((s) => ({ pairs: s.pairs.filter((p) => p.id !== id) })),
      toggle: (from, to) => {
        const id = pairId(from, to);
        if (get().pairs.some((p) => p.id === id)) get().remove(id);
        else get().add(from, to);
      },
      has: (from, to) => {
        const id = pairId(from, to);
        return get().pairs.some((p) => p.id === id);
      },
      reorder: (fromIndex, toIndex) =>
        set((s) => ({ pairs: arrayMove(s.pairs, fromIndex, toIndex) })),
    }),
    {
      name: "fxpulse:favorites",
      version: 1,
      storage: jsonStorage,
      skipHydration: true,
    },
  ),
);
