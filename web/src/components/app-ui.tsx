"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared iOS-style primitives used across the /dashboard/* pages.
// Centralized here so every dashboard screen reaches for the same
// visual vocabulary — section labels, grouped cards, rows, status
// chips. Mirrors what the mobile app uses inside its tabs.

export function PageTitle({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  return (
    <div className="app-page-title">
      {eyebrow ? <div className="app-eyebrow">{eyebrow}</div> : null}
      <h1 className="app-h1">{title}</h1>
      {subtitle ? <div className="app-sub">{subtitle}</div> : null}
      <style jsx>{`
        .app-page-title {
          padding: 4px 4px 12px;
        }
        .app-eyebrow {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          color: rgba(60, 60, 67, 0.6);
        }
        .app-h1 {
          margin: 4px 0 0;
          font-size: 30px;
          font-weight: 700;
          letter-spacing: -0.5px;
          color: #16252e;
        }
        .app-sub {
          font-size: 14px;
          color: rgba(60, 60, 67, 0.6);
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}

export function SectionLabel({
  children,
  action,
}: {
  children: ReactNode;
  action?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div className="app-section-label">
      <span>{children}</span>
      {action ? (
        action.href ? (
          <Link href={action.href} className="app-section-action">
            {action.label} →
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className="app-section-action">
            {action.label} →
          </button>
        )
      ) : null}
      <style jsx>{`
        .app-section-label {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          padding: 16px 4px 8px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.6px;
          color: rgba(60, 60, 67, 0.6);
          text-transform: uppercase;
        }
        .app-section-action {
          font-size: 12px;
          font-weight: 700;
          color: #2a8fa8;
          letter-spacing: 0.4px;
          text-decoration: none;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
        }
      `}</style>
    </div>
  );
}

export function StatusCard({
  label,
  count,
  tone,
  href,
}: {
  label: string;
  count: number;
  tone: "accent" | "danger" | "warning";
  href?: string;
}) {
  const inner = (
    <div className={cn("app-status", `app-status-${tone}`)}>
      <div className="app-status-count">{count}</div>
      <div className="app-status-label">{label}</div>
      <style jsx>{`
        .app-status {
          padding: 14px;
          border-radius: 16px;
          display: block;
          color: inherit;
          text-decoration: none;
          transition: transform 120ms ease;
        }
        .app-status:active {
          transform: scale(0.98);
        }
        .app-status-accent {
          background: #e1f1f5;
          color: #1e6c80;
        }
        .app-status-danger {
          background: #fde2e1;
          color: #ba1a1a;
        }
        .app-status-warning {
          background: #fcf2cc;
          color: #b58400;
        }
        .app-status-count {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.5px;
          line-height: 1;
        }
        .app-status-label {
          font-size: 12px;
          font-weight: 600;
          margin-top: 6px;
        }
      `}</style>
    </div>
  );
  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none" }}>
        {inner}
      </Link>
    );
  }
  return inner;
}

export function Card({
  children,
  noPadding,
  className,
}: {
  children: ReactNode;
  noPadding?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("app-card", noPadding && "app-card-flush", className)}>
      {children}
      <style jsx>{`
        .app-card {
          background: #fff;
          border-radius: 14px;
          padding: 16px;
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.03);
        }
        .app-card-flush {
          padding: 0;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

export function ListRow({
  icon,
  title,
  subtitle,
  trailing,
  href,
  onClick,
  iconTint = "primary",
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  iconTint?: "primary" | "danger" | "warning" | "muted";
}) {
  const showChevron = (href || onClick) && trailing === undefined;
  const content = (
    <div className="app-row">
      {icon ? (
        <div className={cn("app-row-icon", `app-row-icon-${iconTint}`)}>{icon}</div>
      ) : null}
      <div className="app-row-body">
        <div className="app-row-title">{title}</div>
        {subtitle ? <div className="app-row-sub">{subtitle}</div> : null}
      </div>
      {trailing !== undefined ? (
        <div className="app-row-trailing">{trailing}</div>
      ) : showChevron ? (
        <ChevronRight size={16} color="rgba(60, 60, 67, 0.3)" />
      ) : null}
      <style jsx>{`
        .app-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          cursor: ${href || onClick ? "pointer" : "default"};
        }
        :global(.app-card-flush) :global(.app-row + .app-row) {
          border-top: 0.5px solid rgba(60, 60, 67, 0.18);
        }
        .app-row-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .app-row-icon-primary {
          background: #e1f1f5;
          color: #2a8fa8;
        }
        .app-row-icon-danger {
          background: #fde2e1;
          color: #ba1a1a;
        }
        .app-row-icon-warning {
          background: #fcf2cc;
          color: #b58400;
        }
        .app-row-icon-muted {
          background: #efeae0;
          color: rgba(60, 60, 67, 0.55);
        }
        .app-row-body {
          flex: 1;
          min-width: 0;
        }
        .app-row-title {
          font-size: 15px;
          font-weight: 600;
          color: #16252e;
        }
        .app-row-sub {
          font-size: 12px;
          color: rgba(60, 60, 67, 0.6);
          margin-top: 2px;
        }
        .app-row-trailing {
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
  if (href) {
    return (
      <Link href={href} style={{ display: "block", color: "inherit", textDecoration: "none" }}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          display: "block",
          width: "100%",
          background: "transparent",
          border: "none",
          padding: 0,
          color: "inherit",
        }}
      >
        {content}
      </button>
    );
  }
  return content;
}

export function Chip({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  return (
    <span className={cn("app-chip", `app-chip-${tone}`)}>
      {label}
      <style jsx>{`
        .app-chip {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }
        .app-chip-success {
          background: #d6ecf2;
          color: #1e6c80;
        }
        .app-chip-warning {
          background: #fcf2cc;
          color: #92400e;
        }
        .app-chip-danger {
          background: #fde2e1;
          color: #991b1b;
        }
        .app-chip-neutral {
          background: #efeae0;
          color: rgba(60, 60, 67, 0.6);
        }
      `}</style>
    </span>
  );
}

// Avatar that prefers the pet's uploaded photo, falls back to a
// colored initial. Mirrors the mobile PetAvatar so the web reads as
// the same product. Callers pass the full pet for symmetry with the
// mobile API; the legacy `name`-only signature still works for the
// rare case where we don't have a pet object handy.
export function PetAvatar({
  pet,
  name,
  photoUrl,
  size = 48,
  tone = "#E1F1F5",
}: {
  /** Preferred: pass the full pet so we get photo + name + species. */
  pet?: { name: string; photoUrl?: string | null; species?: string };
  /** Fallback when we only have a string (e.g. denormalized share row). */
  name?: string;
  /** Direct photo override; rare. */
  photoUrl?: string | null;
  size?: number;
  tone?: string;
}) {
  const resolvedName = pet?.name ?? name ?? "?";
  const resolvedPhoto = photoUrl ?? pet?.photoUrl ?? null;
  const initial = resolvedName[0]?.toUpperCase() ?? "?";

  const base = {
    width: size,
    height: size,
    borderRadius: 999,
    flexShrink: 0,
  } as const;

  if (resolvedPhoto) {
    // Plain <img> with `loading="lazy"` so a long pet list doesn't
    // block initial render. Firebase download URLs serve with proper
    // CORS for the configured bucket, so no proxy needed.
    return (
      <img
        src={resolvedPhoto}
        alt={resolvedName}
        loading="lazy"
        style={{
          ...base,
          objectFit: "cover",
          background: "#f3eddf",
        }}
      />
    );
  }

  return (
    <div
      style={{
        ...base,
        background: tone,
        color: "#2a8fa8",
        fontWeight: 700,
        fontSize: size * 0.4,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-label={resolvedName}
    >
      {initial}
    </div>
  );
}

export function EmptyCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div className="app-empty">
      <div className="app-empty-title">{title}</div>
      <div className="app-empty-body">{body}</div>
      {action ? (
        action.href ? (
          <Link href={action.href} className="app-empty-cta">
            {action.label}
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className="app-empty-cta">
            {action.label}
          </button>
        )
      ) : null}
      <style jsx>{`
        .app-empty {
          background: #fff;
          border: 1.5px dashed rgba(60, 60, 67, 0.18);
          border-radius: 14px;
          padding: 24px 16px;
          text-align: center;
        }
        .app-empty-title {
          font-size: 15px;
          font-weight: 600;
          color: #16252e;
        }
        .app-empty-body {
          font-size: 13px;
          color: rgba(60, 60, 67, 0.6);
          margin-top: 6px;
          line-height: 1.4;
          max-width: 320px;
          margin-left: auto;
          margin-right: auto;
        }
        .app-empty-cta {
          display: inline-block;
          margin-top: 12px;
          padding: 8px 14px;
          border-radius: 999px;
          background: #2a8fa8;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          border: none;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
