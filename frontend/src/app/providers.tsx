"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError } from "@/lib/api/types";

/**
 * The data layer, mounted once.
 *
 * The client is built inside `useState` rather than at module scope so it is
 * created per render tree. A module-level client is shared by every request the
 * server handles, which leaks one user's cached data into the next one's page.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // A refused or malformed request will be refused again. Only retry
            // what could plausibly differ next time: a network blip or a 5xx.
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status < 500) return false;
              return failureCount < 2;
            },
            staleTime: 60_000,
            // This is a mobile web app opened from a chat; refetching every time
            // the user tabs back is noise, not freshness.
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
