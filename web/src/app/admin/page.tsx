"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getIdToken } from "@/lib/auth-context";
import { STATUS_LABELS, STATUS_TONES, type SupportIssue } from "@/lib/support";
import { relativeTime } from "@/lib/utils";

interface DashboardData {
  counts: {
    totalUsers: number;
    totalProfiles: number;
    usersMissingProfile: number;
    totalPremium: number;
    totalPets: number;
    openTickets: number;
    inReviewTickets: number;
    recentSignups: number;
    disabledUsers: number;
    activeUsers7d: number;
    activeUsers30d: number;
    activeUsers90d: number;
    totalTrackedOcrUses: number;
    totalFreeOcrUses: number;
    usersWithTrackedOcr: number;
    estimatedOcrCostUsd: number;
    ocrCostPerUseUsd: number;
    usersWithErrors: number;
    errorTickets: number;
    billingTickets: number;
    ocrTickets: number;
    downgradedPetHouseholds: number;
    premiumInactive30d: number;
    premiumTrials: number;
    premiumRenewing: number;
    purchases7d: number;
    purchases30d: number;
  };
  purchases: {
    weekly: { label: string; count: number }[];
    monthly: { label: string; count: number }[];
  };
  recentTickets: SupportIssue[];
}

interface Analytics {
  last7: number;
  total30: number;
  entry30: number;
  topPaths: { path: string; count: number }[];
  topLandingPaths: { path: string; count: number }[];
  topSources: { label: string; count: number }[];
  topMediums: { label: string; count: number }[];
  topReferrers: { label: string; count: number }[];
  topCampaigns: { label: string; count: number }[];
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

  const premiumRate = useMemo(() => {
    if (!data || data.counts.totalUsers === 0) return 0;
    return Math.round((data.counts.totalPremium / data.counts.totalUsers) * 100);
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Admin overview</h1>
      <p className="mt-1 text-sm text-muted">
        Users, OCR, support quality, and activity health in one place.
      </p>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      {data ? (
        <>
          <Section title="Users">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Tile label="Total users" value={data.counts.totalUsers} href="/admin/users" />
              <Tile
                label="Premium users"
                value={data.counts.totalPremium}
                sub={`${premiumRate}% of users`}
              />
              <Tile
                label="Pets tracked"
                value={data.counts.totalPets}
                sub={ratio(data.counts.totalPets, data.counts.totalUsers, "per user")}
              />
              <Tile label="Signups (7d)" value={data.counts.recentSignups} />
              <Tile label="Active users (7d)" value={data.counts.activeUsers7d} />
              <Tile label="Active users (30d)" value={data.counts.activeUsers30d} />
              <Tile label="Active users (90d)" value={data.counts.activeUsers90d} />
              <Tile label="Disabled users" value={data.counts.disabledUsers} />
            </div>
          </Section>

          <Section title="OCR">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Tile label="Tracked OCR uses" value={data.counts.totalTrackedOcrUses} />
              <Tile label="Users with OCR usage" value={data.counts.usersWithTrackedOcr} />
              <Tile
                label="Estimated OCR cost"
                value={money(data.counts.estimatedOcrCostUsd)}
                sub={`${money(data.counts.ocrCostPerUseUsd)} per OCR`}
              />
              <Tile
                label="Free OCR scans used"
                value={data.counts.totalFreeOcrUses}
                sub="Legacy/free-trial counter"
              />
            </div>
          </Section>

          <Section title="Support & Errors">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              <Tile
                label="Stored client errors"
                value={data.counts.errorTickets}
                href="/admin/tickets"
              />
              <Tile
                label="Users with errors"
                value={data.counts.usersWithErrors}
                href="/admin/users"
              />
              <Tile
                label="Billing tickets"
                value={data.counts.billingTickets}
                href="/admin/tickets?category=billing_issue"
              />
              <Tile
                label="OCR tickets"
                value={data.counts.ocrTickets}
                href="/admin/tickets?category=ocr_issue"
              />
              <Tile
                label="Auth/profile gap"
                value={data.counts.usersMissingProfile}
                sub={`${data.counts.totalProfiles} profile docs`}
              />
            </div>
          </Section>

          <Section title="Subscriptions">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Tile label="First purchases (7d)" value={data.counts.purchases7d} />
              <Tile label="First purchases (30d)" value={data.counts.purchases30d} />
              <Tile
                label="Premium on trial"
                value={data.counts.premiumTrials}
                sub="Current trial entitlements"
              />
              <Tile
                label="Premium renewing"
                value={data.counts.premiumRenewing}
                sub="Auto-renew still on"
              />
              <Tile
                label="Likely downgraded households"
                value={data.counts.downgradedPetHouseholds}
                sub="Free users storing more than 2 pets"
              />
              <Tile
                label="Premium inactive (30d)"
                value={data.counts.premiumInactive30d}
                sub="Potential churn risk"
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <TrendList
                title="Purchases by week"
                items={data.purchases.weekly}
                empty="No purchase history tracked yet."
              />
              <TrendList
                title="Purchases by month"
                items={data.purchases.monthly}
                empty="No purchase history tracked yet."
              />
            </div>
          </Section>

          {analytics ? (
            <Section title="Website Traffic">
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
                    <div>
                      <div className="text-3xl font-bold">{analytics.entry30}</div>
                      <div className="mt-1 text-sm text-muted">Tracked entries (30d)</div>
                    </div>
                  </div>
                  <div className="mt-5 flex h-16 items-end gap-1">
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
                  <div className="mb-3 text-sm font-semibold">Top pages (30d)</div>
                  {analytics.topPaths.length === 0 ? (
                    <div className="text-sm text-muted">No page views recorded yet.</div>
                  ) : (
                    <ul className="space-y-2">
                      {analytics.topPaths.map((p) => (
                        <li key={p.path} className="flex items-center justify-between gap-4 text-sm">
                          <span className="truncate font-mono text-muted">{p.path}</span>
                          <span className="shrink-0 font-semibold">{p.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <AnalyticsList
                  title="Top sources"
                  items={analytics.topSources}
                  empty="No source data yet."
                />
                <AnalyticsList
                  title="Top referrers"
                  items={analytics.topReferrers}
                  empty="No referrer data yet."
                />
                <AnalyticsList
                  title="Top landing pages"
                  items={analytics.topLandingPaths.map((item) => ({
                    label: item.path,
                    count: item.count,
                  }))}
                  empty="No landing-page data yet."
                />
                <AnalyticsList
                  title="Top campaigns"
                  items={analytics.topCampaigns}
                  empty="No campaign data yet."
                />
              </div>
            </Section>
          ) : null}

          <Section title="Recent Tickets">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm text-muted">Most recently updated issues.</div>
              <Link href="/admin/tickets" className="text-sm font-semibold text-primary hover:underline">
                All tickets {"->"}
              </Link>
            </div>
            {data.recentTickets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong bg-surface p-6 text-center text-sm text-muted">
                No tickets yet.
              </div>
            ) : (
              <ul className="divide-y divide-divider rounded-2xl border border-border bg-surface">
                {data.recentTickets.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/admin/tickets/${t.id}`}
                      className="flex items-start gap-4 px-4 py-3 transition hover:bg-surface-elevated"
                    >
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_TONES[t.status]}`}
                      >
                        {STATUS_LABELS[t.status]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{t.message}</div>
                        <div className="truncate text-xs text-muted">
                          {t.email ?? t.uid} · {t.category}
                          {t.lastError ? " · has client error" : ""}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-faint">{relativeTime(t.updatedAt)}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      ) : (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          Loading...
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Tile({
  label,
  value,
  sub,
  href,
  tone,
}: {
  label: string;
  value: number | string;
  sub?: string;
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
      {sub ? <div className="mt-1 text-xs text-faint">{sub}</div> : null}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

function ratio(num: number, den: number, suffix: string) {
  if (!den) return `0 ${suffix}`;
  return `${(num / den).toFixed(1)} ${suffix}`;
}

function AnalyticsList({
  title,
  items,
  empty,
}: {
  title: string;
  items: { label: string; count: number }[];
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      {items.length === 0 ? (
        <div className="text-sm text-muted">{empty}</div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-4 text-sm">
              <span className="truncate text-muted">{item.label}</span>
              <span className="shrink-0 font-semibold">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TrendList({
  title,
  items,
  empty,
}: {
  title: string;
  items: { label: string; count: number }[];
  empty: string;
}) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      {items.length === 0 ? (
        <div className="text-sm text-muted">{empty}</div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.label}
              className="grid grid-cols-[90px_1fr_auto] items-center gap-3 text-sm"
            >
              <span className="font-mono text-xs text-muted">{item.label}</span>
              <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(item.count > 0 ? 6 : 0, (item.count / max) * 100)}%` }}
                />
              </div>
              <span className="font-semibold">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
