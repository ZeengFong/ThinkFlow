"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderOpen, Calendar, Settings, Workflow, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col border-r border-border bg-white/60 backdrop-blur-xl dark:bg-[#1A1A1A]/80">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2.5 px-6 py-5 transition-opacity hover:opacity-80"
      >
        <Workflow className="h-6 w-6 text-baby-blue" />
        <span className="text-xl font-semibold tracking-tight text-foreground">
          ThinkFlow
        </span>
      </Link>

      {/* Nav */}
      <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
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

      {/* Bottom — User info + Sign out */}
      <div className="border-t border-border px-4 py-4">
        {user ? (
          <div className="flex items-center gap-2">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt=""
                className="h-7 w-7 rounded-full"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-baby-blue/15 text-xs font-medium text-baby-blue">
                {(user.email || "U")[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                {user.user_metadata?.full_name || user.email}
              </p>
            </div>
            <button
              onClick={signOut}
              title="Sign out"
              className="press rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">ThinkFlow v0.1</p>
        )}
      </div>
    </aside>
  );
}
