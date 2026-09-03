"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { makeQueryClient } from "@/lib/query";
import { ThemeApplier } from "@/components/theme/ThemeApplier";
import { AlertEngine } from "@/components/alerts/AlertEngine";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeApplier />
      <AlertEngine />
      {children}
      <Toaster
        position="top-right"
        theme="system"
        richColors
        closeButton
        toastOptions={{ duration: 8000 }}
      />
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
