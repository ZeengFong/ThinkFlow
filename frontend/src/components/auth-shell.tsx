"use client";

import { useAuth } from "@/lib/auth-context";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Loader2, Workflow } from "lucide-react";

/**
 * AuthShell conditionally renders the sidebar and protects routes.
 * Public routes: /, /login, /auth/*
 * Everything else requires auth.
 */
const PUBLIC_ROUTES = ["/", "/login", "/auth/callback"];

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith("/auth/")
  );

  useEffect(() => {
    if (!loading && !user && !isPublic) {
      router.replace("/login");
    }
  }, [user, loading, isPublic, router]);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Workflow className="h-8 w-8 text-baby-blue animate-pulse" />
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Public routes — no sidebar
  if (isPublic) {
    return <main>{children}</main>;
  }

  // Not authed and not public — show nothing (redirect in effect)
  if (!user) {
    return null;
  }

  // Authed — show sidebar + content
  return (
    <>
      <Sidebar />
      <main className="ml-[220px] min-h-screen">{children}</main>
    </>
  );
}
