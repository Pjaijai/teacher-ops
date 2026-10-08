"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { OutOfCreditsDialog } from "@/features/account/components/out-of-credits-dialog";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiClientError } from "@/lib/api-client";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (count, err) => !(err instanceof ApiClientError && err.status < 500) && count < 2,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>
        {children}
        <OutOfCreditsDialog />
        <Toaster richColors position="top-center" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
