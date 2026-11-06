"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, FolderOpen, Home, LogOut, Settings, Workflow, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const name = user?.user_metadata?.full_name || user?.email || "";
  const avatar = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed left-0 top-0 z-50 flex h-[100dvh] w-[240px] flex-col border-r border-border bg-white/90 backdrop-blur-xl transition-transform dark:bg-[#1A1A1A]/95 md:z-40 md:w-[220px] md:translate-x-0 md:bg-white/60 md:dark:bg-[#1A1A1A]/80 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <Link href="/home" onClick={onClose} className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <Workflow className="h-6 w-6 text-baby-blue" />
            <span className="text-xl font-semibold tracking-tight text-foreground">ThinkFlow</span>
          </Link>
          <button onClick={onClose} aria-label="Close menu" className="rounded-lg p-1 text-muted-foreground md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`press flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-baby-blue/15 text-baby-blue-dark"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border px-4 py-4">
          {user && (
            <div className="flex items-center gap-2">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-baby-blue/15 text-xs font-medium text-baby-blue">
                  {(name || "U")[0].toUpperCase()}
                </div>
              )}
              <p className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{name}</p>
              <button
                onClick={signOut}
                title="Sign out"
                aria-label="Sign out"
                className="press rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
