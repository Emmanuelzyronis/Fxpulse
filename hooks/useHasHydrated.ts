"use client";

import { useEffect, useState } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { useLogStore } from "@/stores/logStore";
import { useAlertsStore } from "@/stores/alertsStore";

/**
 * Persisted stores use `skipHydration` to avoid an SSR/client markup mismatch.
 * Rehydration must happen exactly once, no matter how many components gate on
 * it, so it's driven by a module-level singleton that all consumers subscribe
 * to. UI that depends on persisted state renders a skeleton until `true`.
 */
let started = false;
let done = false;
const listeners = new Set<() => void>();

function ensureHydration(): void {
  if (started) return;
  started = true;
  Promise.all([
    useSettingsStore.persist.rehydrate(),
    useFavoritesStore.persist.rehydrate(),
    useLogStore.persist.rehydrate(),
    useAlertsStore.persist.rehydrate(),
  ]).finally(() => {
    done = true;
    listeners.forEach((l) => l());
  });
}

export function useHasHydrated(): boolean {
  const [hydrated, setHydrated] = useState(done);

  useEffect(() => {
    if (done) {
      setHydrated(true);
      return;
    }
    const notify = () => setHydrated(true);
    listeners.add(notify);
    ensureHydration();
    return () => {
      listeners.delete(notify);
    };
  }, []);

  return hydrated;
}
