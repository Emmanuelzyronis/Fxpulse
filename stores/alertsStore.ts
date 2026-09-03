import { create } from "zustand";
import { persist } from "zustand/middleware";
import { jsonStorage } from "@/lib/storage/persist";
import { newId } from "@/lib/id";
import type { RateAlert, AlertDirection } from "@/types/alerts";

export interface CreateAlertInput {
  from: string;
  to: string;
  direction: AlertDirection;
  target: number;
  repeat?: boolean;
  note?: string;
}

interface AlertsState {
  alerts: RateAlert[];
  create: (input: CreateAlertInput) => RateAlert;
  remove: (id: string) => void;
  update: (id: string, patch: Partial<RateAlert>) => void;
  /** One-shot fire bookkeeping: mark triggered with the value that tripped it. */
  markTriggered: (id: string, value: number) => void;
  /** Re-activate a repeating alert after its rate crossed back (hysteresis). */
  reArm: (id: string) => void;
  clearTriggered: () => void;
}

export const useAlertsStore = create<AlertsState>()(
  persist(
    (set) => ({
      alerts: [],
      create: (input) => {
        const alert: RateAlert = {
          id: newId(),
          from: input.from,
          to: input.to,
          direction: input.direction,
          target: input.target,
          repeat: input.repeat ?? false,
          status: "active",
          createdAt: Date.now(),
          note: input.note,
        };
        set((s) => ({ alerts: [alert, ...s.alerts] }));
        return alert;
      },
      remove: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
      update: (id, patch) =>
        set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      markTriggered: (id, value) =>
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id
              ? { ...a, status: "triggered", triggeredAt: Date.now(), lastValue: value }
              : a,
          ),
        })),
      reArm: (id) =>
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id ? { ...a, status: "active", triggeredAt: undefined } : a,
          ),
        })),
      clearTriggered: () =>
        set((s) => ({ alerts: s.alerts.filter((a) => a.status !== "triggered") })),
    }),
    {
      name: "fxpulse:alerts",
      version: 1,
      storage: jsonStorage,
      skipHydration: true,
    },
  ),
);
