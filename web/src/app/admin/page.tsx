"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getIdToken } from "@/lib/auth-context";
import { relativeTime } from "@/lib/utils";
import { STATUS_LABELS, STATUS_TONES, type SupportIssue } from "@/lib/support";

interface DashboardData {
  counts: {
    totalUsers: number;
    totalPremium: number;
    totalPets: number;
    openTickets: number;
    inReviewTickets: number;
    recentSignups: number; // last 7d
  };
  recentTickets: SupportIssue[];
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch("/api/admin/dashboard", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Could not load admin overview.");
      const body = await res.json();
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Admin overview</h1>
      <p className="mt-1 text-muted text-sm">
        At-a-glance view of users, tickets, and platform health.
      </p>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      {data ? (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Total users" value={data.counts.totalUsers} />
            <Tile label="Premium users" value={data.counts.totalPremium} />
            <Tile label="Pets tracked" value={data.counts.totalPets} />
            <Tile label="Signups (7d)" value={data.counts.recentSignups} />
            <Tile
              label="Open tickets"
              value={data.counts.openTickets}
              href="/admin/tickets"
              tone="warning"
            />
            <Tile
              label="In review"
              value={data.counts.inReviewTickets}
              href="/admin/tickets"
              tone="primary"
            />
          </div>

          <section className="mt-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Recent tickets</h2>
              <Link
                href="/admin/tickets"
                className="text-sm font-semibold text-primary hover:underline"
              >
                All tickets →
              </Link>
            </div>
            {data.recentTickets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong bg-surface p-6 text-center text-sm text-muted">
                No tickets yet.
              </div>
            ) : (
              <ul className="rounded-2xl border border-border bg-surface divide-y divide-divider">
                {data.recentTickets.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/admin/tickets/${t.id}`}
                      className="flex items-start gap-4 px-4 py-3 hover:bg-surface-elevated transition"
                    >
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${STATUS_TONES[t.status]}`}
                      >
                        {STATUS_LABELS[t.status]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{t.message}</div>
                        <div className="text-xs text-muted truncate">
                          {t.email ?? t.uid} · {t.category}
                        </div>
                      </div>
                      <div className="text-xs text-faint shrink-0">
                        {relativeTime(t.updatedAt)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          Loading…
        </div>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href?: string;
  tone?: "warning" | "primary";
}) {
  const toneStyles = tone
    ? tone === "warning"
      ? "border-warning/40 bg-warning-soft/30"
      : "border-primary/40 bg-primary-soft/40"
    : "border-border bg-surface";
  const content = (
    <div className={`rounded-2xl border p-5 ${toneStyles}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
