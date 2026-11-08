"use client";

import { useAuth } from "@/lib/auth-context";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Loader2, Menu, Workflow } from "lucide-react";

/**
 * Renders the sidebar and protects routes. Public: /, /login, /privacy, /terms, /auth/*.
 * Data is also protected server-side: the backend checks every request.
 */
const PUBLIC_ROUTES = ["/", "/login", "/privacy", "/terms"];

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const isPublic = PUBLIC_ROUTES.includes(pathname) || pathname.startsWith("/auth/");

  useEffect(() => {
    if (!loading && !user && !isPublic) router.replace("/login");
  }, [user, loading, isPublic, router]);

  if (isPublic) return <main>{children}</main>;

  if (loading || !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Workflow className="h-8 w-8 animate-pulse text-baby-blue" />
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:hidden">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="press -ml-1 rounded-lg p-1.5 text-foreground hover:bg-muted"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Workflow className="h-5 w-5 text-baby-blue" />
        <span className="font-semibold tracking-tight text-foreground">ThinkFlow</span>
      </header>
      <main className="min-h-[calc(100dvh-3.5rem)] md:ml-[220px] md:min-h-screen">{children}</main>
    </>
  );
}
