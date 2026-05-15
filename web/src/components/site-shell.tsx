"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Button } from "./ui/button";

// Public site chrome: header + footer that wraps the marketing pages
// (landing, legal, contact) and any non-app route. The dashboard uses
// its own shell instead.

const NAV = [
  { href: "/", label: "Home" },
  { href: "/#features", label: "Features" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
            <span className="text-base">P</span>
          </span>
          PawProof
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "px-3 py-2 text-sm font-medium text-muted hover:text-foreground",
                pathname === n.href && "text-foreground",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {loading ? null : user ? (
            <Link href="/dashboard">
              <Button size="sm">Open dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="hidden md:inline">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/sign-in?mode=signup">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
          <button
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span className="block h-0.5 w-4 bg-foreground" />
          </button>
        </div>
      </div>
      {open ? (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-sm font-medium text-muted hover:text-foreground"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface-elevated">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm">
              P
            </span>
            PawProof
          </div>
          <p className="mt-3 text-sm text-muted max-w-xs">
            The pet care journal: vaccines, reminders, records, and emergency
            info for every pet in your household.
          </p>
        </div>
        <FooterColumn title="Product">
          <FooterLink href="/#features">Features</FooterLink>
          <FooterLink href="/#pricing">Pricing</FooterLink>
          <FooterLink href="/sign-in">Sign in</FooterLink>
        </FooterColumn>
        <FooterColumn title="Support">
          <FooterLink href="/contact">Contact</FooterLink>
          <FooterLink href="mailto:support@pawproof.app">support@pawproof.app</FooterLink>
          <FooterLink href="/unsubscribe">Unsubscribe</FooterLink>
        </FooterColumn>
        <FooterColumn title="Legal">
          <FooterLink href="/privacy">Privacy Policy</FooterLink>
          <FooterLink href="/terms">Terms of Service</FooterLink>
        </FooterColumn>
      </div>
      <div className="mx-auto max-w-6xl border-t border-border px-4 py-6 text-xs text-faint flex flex-col gap-2 md:flex-row md:justify-between">
        <span>© {new Date().getFullYear()} PawProof. All rights reserved.</span>
        <span>Made for pet owners who care.</span>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-faint">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-muted">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="hover:text-foreground transition">
        {children}
      </Link>
    </li>
  );
}
