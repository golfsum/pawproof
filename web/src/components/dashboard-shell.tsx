"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { useAuth, getIdToken } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

// Shell for /dashboard/* and /admin/*. Provides:
//  - auth guard (kicks unauthenticated users to /sign-in)
//  - admin probe (so /admin/* can flip the user away to /dashboard if
//    they're not actually admins — defence in depth on top of the
//    server-side requireAdmin() check on every API call)
//  - left rail + top bar
//
// Server-side auth would be ideal, but Firebase Auth state lives in
// IndexedDB so client-side is the practical path.

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const USER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "▦" },
  { href: "/dashboard/pets", label: "Pets", icon: "🐾" },
  { href: "/dashboard/reminders", label: "Reminders", icon: "⏰" },
  { href: "/dashboard/records", label: "Records", icon: "📂" },
  { href: "/dashboard/support", label: "Support", icon: "✉" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "▦" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/tickets", label: "Tickets", icon: "✉" },
];

export function DashboardShell({
  children,
  kind,
}: {
  children: React.ReactNode;
  kind: "user" | "admin";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Guard: unauthenticated users get bounced to sign-in.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, router, pathname]);

  // Admin probe — only relevant under /admin. Endpoint verifies the
  // bearer token server-side; client never gets to fake the answer.
  useEffect(() => {
    if (kind !== "admin" || !user) return;
    let cancelled = false;
    (async () => {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch("/api/admin/check", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        router.replace("/dashboard");
      } else {
        setIsAdmin(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, user, router]);

  if (loading || (kind === "admin" && isAdmin === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted">Loading…</div>
      </div>
    );
  }
  if (!user) return null;
  if (kind === "admin" && !isAdmin) return null;

  const nav = kind === "admin" ? ADMIN_NAV : USER_NAV;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-surface">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              P
            </span>
            PawProof
          </Link>
          {kind === "admin" ? (
            <span className="ml-auto rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-dark">
              Admin
            </span>
          ) : null}
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-primary-soft text-primary-dark"
                    : "text-muted hover:bg-surface-elevated hover:text-foreground",
                )}
              >
                <span className="text-base w-5 text-center">{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <div className="text-xs text-faint mb-2 truncate">{user.email}</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              if (auth) void signOut(auth).then(() => router.replace("/"));
            }}
          >
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="md:hidden flex h-14 items-center justify-between border-b border-border bg-surface px-4">
          <Link href="/" className="font-bold text-sm">
            PawProof {kind === "admin" ? "Admin" : ""}
          </Link>
          <button
            onClick={() => {
              if (auth) void signOut(auth).then(() => router.replace("/"));
            }}
            className="text-xs text-muted"
          >
            Sign out
          </button>
        </header>
        <main className="flex-1 bg-background">{children}</main>
      </div>
    </div>
  );
}
