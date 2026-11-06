"use client";

import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { meApi } from "@/lib/api";
import { applyTheme, storedTheme } from "@/lib/theme";
import { Toaster } from "@/components/toaster";
import { ServerStatus } from "@/components/server-status";

/** Applies the signed-in user's saved theme (cached locally to avoid a flash). */
function ThemeSync() {
  const { user } = useAuth();
  const me = useQuery({ queryKey: ["me"], queryFn: meApi.get, enabled: !!user, staleTime: 60_000 });

  useEffect(() => {
    const cached = storedTheme();
    if (cached) applyTheme(cached);
  }, []);

  useEffect(() => {
    if (me.data?.theme) applyTheme(me.data.theme);
  }, [me.data?.theme]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 1000 * 30, retry: 1 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeSync />
        <ServerStatus />
        {children}
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
