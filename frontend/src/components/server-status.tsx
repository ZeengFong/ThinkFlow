"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, ServerCrash } from "lucide-react";
import { useEffect, useState } from "react";
import { api, API_BASE } from "@/lib/api";

/**
 * Free hosting (e.g. Render) puts the backend to sleep when idle; the first
 * request then takes up to a minute. Tell the student instead of looking broken.
 */
export function ServerStatus() {
  const [slow, setSlow] = useState(false);
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api.get("/health", { timeout: 75_000 }).then((r) => r.data),
    retry: 2,
    retryDelay: 3000,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!health.isPending) return;
    const timer = setTimeout(() => setSlow(true), 2500);
    return () => clearTimeout(timer);
  }, [health.isPending]);

  if (health.isError) {
    const local = API_BASE.includes("localhost") || API_BASE.includes("127.0.0.1");
    return (
      <Banner tone="error">
        <ServerCrash className="h-4 w-4 shrink-0" />
        <span>
          Can&apos;t reach the ThinkFlow server.{" "}
          {local ? "Is the backend running on port 8000?" : "Please try again in a moment."}
        </span>
        <button onClick={() => health.refetch()} className="ml-2 underline underline-offset-2">
          Retry
        </button>
      </Banner>
    );
  }
  if (health.isPending && slow) {
    return (
      <Banner tone="info">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        <span>Waking up the server… free hosting sleeps when idle, so this can take up to a minute.</span>
      </Banner>
    );
  }
  return null;
}

function Banner({ tone, children }: { tone: "info" | "error"; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className={`fixed left-1/2 top-3 z-[90] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-2 text-xs shadow-soft-lg backdrop-blur-xl ${
        tone === "error"
          ? "border-muted-coral/30 bg-popover text-muted-coral"
          : "border-baby-blue/30 bg-popover text-foreground"
      }`}
    >
      {children}
    </div>
  );
}
