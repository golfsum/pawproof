"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import {
  AlarmClock,
  Calendar as CalendarIcon,
  Folder,
  Home,
  LogOut,
  PawPrint,
  Settings as SettingsIcon,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useAuth, getIdToken } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";

// Responsive app shell for /dashboard/* (and /admin/* via the same
// component). Below ~1024px the shell renders as the iOS-style mobile
// surface: sticky frosted-glass header on top, fixed bottom tab bar.
// Above that breakpoint it switches to a desktop layout with a left
// sidebar (PawProof brand, nav, account footer) and a wider main
// column — better for review/export tasks while still reading as
// PawProof, not a generic admin panel.

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  // True when the active path should match this nav item even when
  // it has additional segments (so /dashboard/pets/abc still
  // highlights Pets). Exact matches are the default to keep Home
  // from staying lit on every nested route.
  matchPrefix?: boolean;
}

const USER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/pets", label: "Pets", icon: PawPrint, matchPrefix: true },
  { href: "/dashboard/reminders", label: "Reminders", icon: AlarmClock, matchPrefix: true },
  { href: "/dashboard/records", label: "Records", icon: Folder, matchPrefix: true },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon, matchPrefix: true },
];

// Extra nav items only surfaced in the desktop sidebar (mobile users
// reach these from inside Settings / Home). Keeping the bottom tab
// bar to five entries preserves the iOS pattern users expect.
const USER_NAV_DESKTOP_EXTRAS: NavItem[] = [
  { href: "/dashboard/support", label: "Support", icon: ShieldAlert, matchPrefix: true },
];

const TITLE_BY_PATH: Array<{ test: (p: string) => boolean; title: string }> = [
  { test: (p) => p === "/dashboard", title: "PawProof" },
  { test: (p) => p.startsWith("/dashboard/pets"), title: "My Pets" },
  { test: (p) => p.startsWith("/dashboard/reminders"), title: "Reminders" },
  { test: (p) => p.startsWith("/dashboard/records"), title: "Records" },
  { test: (p) => p.startsWith("/dashboard/support"), title: "Support" },
  { test: (p) => p.startsWith("/dashboard/settings"), title: "Settings" },
];

export function MobileShell({
  children,
  kind,
}: {
  children: React.ReactNode;
  kind: "user" | "admin";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Auth guard. Unauthenticated visitors get bounced to /sign-in;
  // returnUrl preserved so they land back here after sign-in.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, router, pathname]);

  // Admin probe — only fires under /admin/*. We never reach this
  // branch under /dashboard but the prop is preserved for callers
  // that share the shell.
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
      if (!res.ok) router.replace("/dashboard");
      else setIsAdmin(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, user, router]);

  if (loading || (kind === "admin" && isAdmin === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted">Loading…</div>
      </div>
    );
  }
  if (!user) return null;
  if (kind === "admin" && !isAdmin) return null;

  const headerTitle =
    TITLE_BY_PATH.find((t) => t.test(pathname))?.title ?? "PawProof";

  const handleSignOut = () => {
    if (auth) void signOut(auth).then(() => router.replace("/"));
  };

  const renderNavItem = (n: NavItem, variant: "tab" | "sidebar") => {
    const Icon = n.icon;
    const active = n.matchPrefix
      ? pathname.startsWith(n.href)
      : pathname === n.href;
    return (
      <Link
        key={`${variant}-${n.href}`}
        href={n.href}
        role={variant === "tab" ? "tab" : undefined}
        aria-selected={variant === "tab" ? active : undefined}
        className={cn(
          variant === "tab" ? "ms-tab" : "ms-side-link",
          active && (variant === "tab" ? "ms-tab-active" : "ms-side-link-active"),
        )}
      >
        <Icon size={variant === "tab" ? 22 : 18} strokeWidth={active ? 2.2 : 1.6} />
        <span className={variant === "tab" ? "ms-tab-label" : "ms-side-link-label"}>{n.label}</span>
      </Link>
    );
  };

  return (
    <div className="mobile-shell">
      {/* ── Desktop sidebar (hidden under 1024px) ─────────────────── */}
      <aside className="ms-sidebar" aria-label="PawProof navigation">
        <Link href="/dashboard" className="ms-side-brand">
          <span className="ms-side-brand-mark">P</span>
          <div className="ms-side-brand-text">
            <span className="ms-side-brand-name">PawProof</span>
            <span className="ms-side-brand-tag">Care, records, reminders</span>
          </div>
        </Link>

        <nav className="ms-side-nav" aria-label="Primary">
          {USER_NAV.map((n) => renderNavItem(n, "sidebar"))}
          <div className="ms-side-divider" aria-hidden />
          {USER_NAV_DESKTOP_EXTRAS.map((n) => renderNavItem(n, "sidebar"))}
        </nav>

        <div className="ms-side-footer">
          <div className="ms-side-account">
            <div className="ms-side-account-avatar">
              {(user.email ?? "?")[0]?.toUpperCase()}
            </div>
            <div className="ms-side-account-text">
              <span className="ms-side-account-email">
                {profile?.displayName ?? user.email ?? "Signed in"}
              </span>
              <span
                className={cn(
                  "ms-side-account-plan",
                  profile?.isPremium && "ms-side-account-plan-plus",
                )}
              >
                {profile?.isPremium ? (
                  <>
                    <Sparkles size={11} /> Plus member
                  </>
                ) : (
                  "Free plan"
                )}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="ms-side-signout"
            aria-label="Sign out"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <div className="ms-content">
        {/* Sticky frosted header. Visible on mobile/tablet; the desktop
            layout hides it because the sidebar already owns the brand. */}
        <header className="ms-header">
          <div className="ms-header-inner">
            <Link href="/dashboard" className="ms-brand">
              <span className="ms-brand-mark">P</span>
              <span className="ms-brand-name">PawProof</span>
            </Link>
            <h1 className="ms-title">{headerTitle}</h1>
            <button
              type="button"
              onClick={handleSignOut}
              className="ms-sign-out"
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="ms-main">{children}</main>
      </div>

      <nav className="ms-tabbar" role="tablist">
        {USER_NAV.map((n) => renderNavItem(n, "tab"))}
      </nav>

      <style jsx global>{`
        .mobile-shell {
          min-height: 100vh;
          min-height: 100dvh;
          background: #e8e1d4;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text",
            "SF Pro Display", "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell,
            sans-serif;
          -webkit-font-smoothing: antialiased;
          -webkit-tap-highlight-color: transparent;
        }

        /* ── Mobile layout (default) ────────────────────────────── */
        .ms-sidebar {
          display: none;
        }
        .ms-content {
          display: flex;
          flex-direction: column;
          min-height: 100dvh;
        }
        .ms-header-inner,
        .ms-main {
          max-width: 520px;
          margin: 0 auto;
          width: 100%;
        }

        /* ── Header ─────────────────────────────────────────────── */
        .ms-header {
          position: sticky;
          top: 0;
          z-index: 30;
          background: rgba(253, 249, 243, 0.82);
          backdrop-filter: saturate(180%) blur(20px);
          -webkit-backdrop-filter: saturate(180%) blur(20px);
          border-bottom: 0.5px solid rgba(60, 60, 67, 0.18);
        }
        .ms-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          padding-top: max(env(safe-area-inset-top), 12px);
        }
        .ms-brand {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: #16252e;
        }
        .ms-brand-mark {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: #2a8fa8;
          color: #fff;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .ms-brand-name {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.2px;
        }
        .ms-title {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #16252e;
          letter-spacing: -0.2px;
        }
        .ms-sign-out {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          background: transparent;
          color: #16252e;
          border: none;
          cursor: pointer;
          transition: background 120ms ease, transform 120ms ease;
        }
        .ms-sign-out:hover {
          background: rgba(42, 143, 168, 0.12);
        }
        .ms-sign-out:active {
          transform: scale(0.94);
        }

        /* ── Main scrolling content ─────────────────────────────── */
        .ms-main {
          padding: 8px 16px 120px;
          background: #fdf9f3;
          min-height: calc(100dvh - 56px);
          background-clip: padding-box;
        }
        @media (min-width: 520px) and (max-width: 1023.98px) {
          .ms-main {
            border-left: 0.5px solid rgba(60, 60, 67, 0.12);
            border-right: 0.5px solid rgba(60, 60, 67, 0.12);
          }
        }

        /* ── Bottom tab bar (mobile only) ───────────────────────── */
        .ms-tabbar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 30;
          display: flex;
          background: rgba(253, 249, 243, 0.88);
          backdrop-filter: saturate(180%) blur(20px);
          -webkit-backdrop-filter: saturate(180%) blur(20px);
          border-top: 0.5px solid rgba(60, 60, 67, 0.18);
          padding: 6px 0;
          padding-bottom: max(env(safe-area-inset-bottom), 6px);
        }
        @media (min-width: 520px) and (max-width: 1023.98px) {
          .ms-tabbar {
            padding-left: calc((100% - 520px) / 2);
            padding-right: calc((100% - 520px) / 2);
          }
        }
        .ms-tab {
          flex: 1;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          padding: 6px 0;
          color: rgba(60, 60, 67, 0.55);
          text-decoration: none;
          transition: color 120ms ease, transform 120ms ease;
        }
        .ms-tab:active {
          transform: scale(0.96);
        }
        .ms-tab-active {
          color: #2a8fa8;
        }
        .ms-tab-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1px;
        }

        /* ── Desktop layout: sidebar + wider main ───────────────── */
        @media (min-width: 1024px) {
          .mobile-shell {
            display: grid;
            grid-template-columns: 260px 1fr;
            min-height: 100dvh;
            background: #fdf9f3;
          }
          .ms-header {
            display: none;
          }
          .ms-tabbar {
            display: none;
          }
          .ms-sidebar {
            display: flex;
            flex-direction: column;
            position: sticky;
            top: 0;
            height: 100dvh;
            background: #fbf2e3;
            border-right: 0.5px solid rgba(60, 60, 67, 0.12);
            padding: 24px 16px 16px;
            gap: 8px;
          }
          .ms-content {
            min-height: 100dvh;
          }
          .ms-main {
            max-width: 1080px;
            padding: 24px 32px 64px;
            border: none;
            background: transparent;
          }
        }

        /* ── Sidebar internals ──────────────────────────────────── */
        .ms-side-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 8px 14px;
          text-decoration: none;
          color: #16252e;
        }
        .ms-side-brand-mark {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #2a8fa8;
          color: #fff;
          font-weight: 700;
          font-size: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .ms-side-brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
        }
        .ms-side-brand-name {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.2px;
          color: #16252e;
        }
        .ms-side-brand-tag {
          font-size: 11px;
          color: rgba(60, 60, 67, 0.55);
          margin-top: 2px;
        }
        .ms-side-nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-top: 4px;
        }
        .ms-side-divider {
          height: 1px;
          background: rgba(60, 60, 67, 0.1);
          margin: 12px 4px;
        }
        .ms-side-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          color: #3a464a;
          text-decoration: none;
          transition: background 120ms ease, color 120ms ease;
        }
        .ms-side-link:hover {
          background: rgba(42, 143, 168, 0.08);
          color: #16252e;
        }
        .ms-side-link-active {
          background: #ffffff;
          color: #2a8fa8;
          font-weight: 600;
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.02), 0 4px 12px rgba(42, 143, 168, 0.08);
        }
        .ms-side-link-label {
          font-size: 14px;
        }

        .ms-side-footer {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px 4px 6px;
          border-top: 1px solid rgba(60, 60, 67, 0.1);
        }
        .ms-side-account {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 12px;
        }
        .ms-side-account-avatar {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          background: #2a8fa8;
          color: #fff;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .ms-side-account-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .ms-side-account-email {
          font-size: 12px;
          font-weight: 600;
          color: #16252e;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
        }
        .ms-side-account-plan {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: rgba(60, 60, 67, 0.55);
          font-weight: 600;
          letter-spacing: 0.2px;
          margin-top: 1px;
        }
        .ms-side-account-plan-plus {
          color: #2a8fa8;
        }
        .ms-side-signout {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          background: transparent;
          color: #6b7480;
          border: none;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 120ms ease;
        }
        .ms-side-signout:hover {
          background: rgba(60, 60, 67, 0.06);
          color: #16252e;
        }
      `}</style>
    </div>
  );
}
