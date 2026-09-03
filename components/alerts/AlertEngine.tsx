"use client";

import { useAlertEngine } from "@/hooks/useAlertEngine";

/**
 * Client-only rate-alert engine, mounted once in Providers. Renders nothing —
 * it just runs the polling/de-dupe/notification loop for the lifetime of the
 * tab. All logic lives in useAlertEngine so it's testable in isolation.
 */
export function AlertEngine() {
  useAlertEngine();
  return null;
}
