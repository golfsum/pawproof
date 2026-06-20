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

interface Analytics {
  last7: number;
  total30: number;
  topPaths: { path: string; count: number }[];
  series: { day: string; count: number }[];
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
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

  const loadAnalytics = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch("/api/admin/analytics", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      setAnalytics(await res.json());
    } catch {
      /* analytics is best-effort; don't block the page */
    }
  }, []);

  useEffect(() => {
    void load();
    void loadAnalytics();
  }, [load, loadAnalytics]);

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

          {analytics ? (
            <section className="mt-10">
              <h2 className="text-lg font-semibold mb-3">Website traffic</h2>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <div className="flex gap-6">
                    <div>
                      <div className="text-3xl font-bold">{analytics.last7}</div>
                      <div className="mt-1 text-sm text-muted">Page views (7d)</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{analytics.total30}</div>
                      <div className="mt-1 text-sm text-muted">Page views (30d)</div>
                    </div>
                  </div>
                  {/* Tiny daily bar chart (last 14 days). */}
                  <div className="mt-5 flex items-end gap-1 h-16">
                    {analytics.series.length === 0 ? (
                      <span className="text-xs text-faint">No views yet.</span>
                    ) : (
                      analytics.series.map((d) => {
                        const max = Math.max(...analytics.series.map((s) => s.count), 1);
                        const h = Math.max(2, Math.round((d.count / max) * 64));
                        return (
                          <div
                            key={d.day}
                            title={`${d.day}: ${d.count}`}
                            className="flex-1 rounded-t bg-primary/70"
                            style={{ height: `${h}px` }}
                          />
                        );
                      })
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-faint">Last 14 days</div>
                </div>

                <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
                  <div className="text-sm font-semibold mb-3">Top pages (30d)</div>
                  {analytics.topPaths.length === 0 ? (
                    <div className="text-sm text-muted">No page views recorded yet.</div>
                  ) : (
                    <ul className="space-y-2">
                      {analytics.topPaths.map((p) => (
                        <li key={p.path} className="flex items-center justify-between gap-4 text-sm">
                          <span className="font-mono text-muted truncate">{p.path}</span>
                          <span className="font-semibold shrink-0">{p.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          ) : null}

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
