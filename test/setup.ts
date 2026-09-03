import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// React Testing Library doesn't auto-clean under Vitest; do it between tests so
// mounted components and portals (toasts, popovers) don't leak across cases.
afterEach(() => {
  cleanup();
});
