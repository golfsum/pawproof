"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useUserData } from "@/lib/use-user-data";
import { daysUntil, isOverdue } from "@/lib/dates";
import { relativeTime } from "@/lib/utils";

export default function DashboardOverview() {
  const { user } = useAuth();
  const { pets, reminders, vaccines, entries, loading } = useUserData();

  const overdue = useMemo(
    () => reminders.filter((r) => !r.isCompleted && isOverdue(r.dueDate)),
    [reminders],
  );
  const dueToday = useMemo(
    () =>
      reminders.filter((r) => {
        if (r.isCompleted) return false;
        if (isOverdue(r.dueDate)) return false;
        const d = daysUntil(r.dueDate);
        return d != null && d === 0;
      }),
    [reminders],
  );
  const expiringSoon = useMemo(
    () =>
      vaccines.filter((v) => {
        if (!v.expirationDate) return false;
        const d = daysUntil(v.expirationDate);
        return d != null && d <= 30 && d >= 0;
      }),
    [vaccines],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
      <header className="mb-8">
        <div className="text-xs uppercase tracking-wider text-faint font-semibold">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Welcome back{user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}.
        </h1>
        <p className="mt-1 text-muted text-sm">
          {pets.length === 0
            ? "Add your first pet in the app to start tracking care."
            : `Managing ${pets.length} pet${pets.length === 1 ? "" : "s"}.`}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Due today"
          count={dueToday.length}
          tone="primary"
          href="/dashboard/reminders"
        />
        <StatCard
          label="Overdue"
          count={overdue.length}
          tone="danger"
          href="/dashboard/reminders"
        />
        <StatCard
          label="Expiring soon"
          count={expiringSoon.length}
          tone="warning"
          href="/dashboard/records"
        />
      </div>

      <Section title="Your pets" action={{ label: "Open Pets", href: "/dashboard/pets" }}>
        {loading ? (
          <Skeleton />
        ) : pets.length === 0 ? (
          <Empty body="No pets yet. Add them from the PawProof mobile app." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pets.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/pets`}
                className="rounded-xl border border-border bg-surface p-4 transition hover:border-primary"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary font-bold">
                    {p.name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-xs text-muted capitalize truncate">
                      {p.species}
                      {p.breed ? ` · ${p.breed}` : ""}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Recent activity"
        action={{ label: "Open Records", href: "/dashboard/records" }}
      >
        {loading ? (
          <Skeleton />
        ) : entries.length === 0 ? (
          <Empty body="Quick Logs from the app (meals, walks, meds, symptoms) show up here." />
        ) : (
          <ul className="rounded-xl border border-border bg-surface divide-y divide-divider">
            {entries.slice(0, 8).map((e) => {
              const pet = pets.find((p) => p.id === e.petId);
              return (
                <li key={e.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.title}</div>
                    <div className="text-xs text-muted truncate">
                      {pet?.name ?? "-"}
                      {e.note ? ` · ${e.note}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-faint shrink-0">
                    {relativeTime(e.timestamp)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

function StatCard({
  label,
  count,
  tone,
  href,
}: {
  label: string;
  count: number;
  tone: "primary" | "danger" | "warning";
  href: string;
}) {
  const toneStyles = {
    primary: "bg-primary-soft text-primary-dark",
    danger: "bg-danger-soft text-danger",
    warning: "bg-warning-soft text-warning",
  }[tone];
  return (
    <Link
      href={href}
      className={`block rounded-2xl p-5 transition hover:scale-[1.01] ${toneStyles}`}
    >
      <div className="text-3xl font-bold">{count}</div>
      <div className="mt-1 text-sm font-semibold">{label}</div>
    </Link>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action ? (
          <Link
            href={action.href}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {action.label} →
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Empty({ body }: { body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong bg-surface p-6 text-center text-sm text-muted">
      {body}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
      Loading…
    </div>
  );
}
