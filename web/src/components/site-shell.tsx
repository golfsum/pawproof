"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { LogoMark } from "./logo";
import { Button } from "./ui/button";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/#features", label: "Features" },
  { href: "/contact", label: "Contact" },
];

const APP_STORE_URL = "https://apps.apple.com/us/app/pawproof-app/id6775067128";

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <LogoMark className="h-9 w-9" />
          PawProof
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
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
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download PawProof on the App Store"
            className="hidden transition-transform hover:scale-[1.03] md:inline-flex"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/app-store-badge.svg" alt="Download on the App Store" className="h-9 w-auto" />
          </a>
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span className="block h-0.5 w-4 bg-foreground" />
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-border bg-background md:hidden">
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
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download PawProof on the App Store"
              onClick={() => setOpen(false)}
              className="mt-2 px-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/app-store-badge.svg" alt="Download on the App Store" className="h-11 w-auto" />
            </a>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface-elevated">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold">
            <LogoMark className="h-8 w-8 rounded-lg" />
            PawProof
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted">
            The pet care journal: vaccines, reminders, records, and emergency info for every
            pet in your household.
          </p>
        </div>
        <FooterColumn title="Product">
          <FooterLink href="/#features">Features</FooterLink>
          <FooterLink href="/#pricing">Pricing</FooterLink>
          <FooterLink href="/sign-in">Sign in</FooterLink>
        </FooterColumn>
        <FooterColumn title="Use cases">
          <FooterLink href="/scan-vaccine-records">Scan vaccine records</FooterLink>
          <FooterLink href="/pet-medication-tracker">Pet medication tracker</FooterLink>
          <FooterLink href="/dog-vaccine-records">Dog vaccine records</FooterLink>
          <FooterLink href="/cat-vaccine-records">Cat vaccine records</FooterLink>
          <FooterLink href="/pet-document-organizer">Pet document organizer</FooterLink>
          <FooterLink href="/pet-health-timeline">Pet health timeline</FooterLink>
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
      <div className="mx-auto flex max-w-6xl flex-col gap-2 border-t border-border px-4 py-6 text-xs text-faint md:flex-row md:justify-between">
        <span>Copyright {new Date().getFullYear()} PawProof. All rights reserved.</span>
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
      <Link href={href} className="transition hover:text-foreground">
        {children}
      </Link>
    </li>
  );
}
