"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getIdToken } from "@/lib/auth-context";
import {
  planLabel,
  premiumStoreLabel,
  type PlanCadence,
} from "@/lib/admin-subscription";
import { fmtDate, relativeTime } from "@/lib/utils";

interface AdminUserRow {
  id: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  hasProfile: boolean;
  onboardingCompleted: boolean;
  isPremium: boolean;
  planCadence: PlanCadence;
  premiumExpiresAt: string | null;
  premiumWillRenew: boolean | null;
  premiumPeriodType: string | null;
  premiumStore: string | null;
  disabled?: boolean;
  freeOcrScansUsed?: number;
  totalOcrCount?: number;
  lastOcrAt?: string | null;
  petCount?: number;
  reminderCount?: number;
  ticketCount?: number;
  errorCount?: number;
  lastErrorAt?: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
}

type SortKey =
  | "displayName"
  | "petCount"
  | "reminderCount"
  | "ticketCount"
  | "errorCount"
  | "totalOcrCount"
  | "subscription"
  | "createdAt"
  | "lastSignInAt";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch("/api/admin/users", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Could not load users.");
      const body = await res.json();
      setUsers(body.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Firebase Auth lives on the client, so the admin request starts after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = needle
      ? users.filter((u) =>
          [
            u.email,
            u.displayName,
            u.id,
            u.isPremium ? planLabel(true, u.planCadence) : "Free",
            u.premiumStore,
          ]
            .filter(Boolean)
            .some((s) => s!.toLowerCase().includes(needle)),
        )
      : users;
    return [...base].sort((a, b) => compareUsers(a, b, sortKey, sortDir));
  }, [users, q, sortKey, sortDir]);

  const summary = useMemo(() => {
    let plus = 0;
    let monthly = 0;
    let yearly = 0;
    let unknownCadence = 0;
    let reminderRecords = 0;
    let reminderUsers = 0;
    let setupComplete = 0;
    let setupIncomplete = 0;
    let profilesMissing = 0;
    let verifiedEmails = 0;

    for (const user of users) {
      if (user.isPremium) {
        plus += 1;
        if (user.planCadence === "monthly") monthly += 1;
        else if (user.planCadence === "yearly") yearly += 1;
        else unknownCadence += 1;
      }
      const reminders = user.reminderCount ?? 0;
      reminderRecords += reminders;
      if (reminders > 0) reminderUsers += 1;
      if (!user.hasProfile) profilesMissing += 1;
      else if (user.onboardingCompleted) setupComplete += 1;
      else setupIncomplete += 1;
      if (user.email && user.emailVerified) verifiedEmails += 1;
    }

    return {
      plus,
      monthly,
      yearly,
      unknownCadence,
      reminderRecords,
      reminderUsers,
      setupComplete,
      setupIncomplete,
      profilesMissing,
      verifiedEmails,
    };
  }, [users]);

  const subscriptionMix = [
    `${summary.monthly} monthly`,
    `${summary.yearly} yearly`,
    summary.unknownCadence > 0 ? `${summary.unknownCadence} cadence unknown` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const setupDetail =
    users.length === 0
      ? "No account profiles"
      : [
          summary.setupIncomplete > 0 ? `${summary.setupIncomplete} incomplete` : null,
          summary.profilesMissing > 0
            ? `${summary.profilesMissing} missing ${summary.profilesMissing === 1 ? "profile" : "profiles"}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ") || "All profiles ready";

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "displayName" ? "asc" : "desc");
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted">
            {users.length} {users.length === 1 ? "user" : "users"} on file. Sorted by sign-up
            date by default.
          </p>
        </div>
        <div className="w-full sm:w-80">
          <label htmlFor="admin-user-search" className="sr-only">
            Search users
          </label>
          <input
            id="admin-user-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, UID, or plan"
            className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm focus:outline-2 focus:outline-primary"
          />
          {q.trim() ? (
            <p className="mt-1 text-right text-xs text-muted" aria-live="polite">
              {filtered.length} of {users.length} shown
            </p>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      {!loading && !error ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Accounts"
            value={users.length}
            detail={`${summary.verifiedEmails} verified ${summary.verifiedEmails === 1 ? "email" : "emails"}`}
          />
          <SummaryCard
            label="Plus access"
            value={summary.plus}
            detail={summary.plus ? subscriptionMix : "No Plus accounts"}
          />
          <SummaryCard
            label="Reminder records"
            value={summary.reminderRecords}
            detail={`${summary.reminderUsers} ${summary.reminderUsers === 1 ? "account" : "accounts"} using reminders`}
          />
          <SummaryCard
            label="Setup complete"
            value={summary.setupComplete}
            detail={setupDetail}
          />
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          Loading...
        </div>
      ) : (
        <div className="mt-6 w-full max-w-full overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated text-xs uppercase tracking-wider text-faint">
              <tr>
                <SortableTh
                  label="User"
                  sortKey="displayName"
                  active={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
                <SortableTh
                  label="Pets"
                  sortKey="petCount"
                  active={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
                <SortableTh
                  label="Reminders"
                  sortKey="reminderCount"
                  active={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
                <SortableTh
                  label="Tickets"
                  sortKey="ticketCount"
                  active={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
                <SortableTh
                  label="Errors"
                  sortKey="errorCount"
                  active={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
                <SortableTh
                  label="OCR"
                  sortKey="totalOcrCount"
                  active={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
                <SortableTh
                  label="Subscription"
                  sortKey="subscription"
                  active={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
                <SortableTh
                  label="Signed up"
                  sortKey="createdAt"
                  active={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
                <SortableTh
                  label="Last sign-in"
                  sortKey="lastSignInAt"
                  active={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-divider hover:bg-surface-elevated">
                  <td className="min-w-[280px] px-4 py-3 align-top">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="block font-semibold text-foreground hover:text-primary"
                    >
                      {u.displayName || u.email || u.id}
                    </Link>
                    {u.email && u.email !== u.displayName ? (
                      <div className="text-xs text-muted">{u.email}</div>
                    ) : null}
                    <div className="mt-0.5 font-mono text-[10px] text-faint">{u.id}</div>
                    <AccountFlags user={u} />
                  </td>
                  <td className="px-4 py-3 align-top">{u.petCount ?? 0}</td>
                  <td className="px-4 py-3 align-top">{u.reminderCount ?? 0}</td>
                  <td className="px-4 py-3 align-top">{u.ticketCount ?? 0}</td>
                  <td className="px-4 py-3 align-top">
                    <div>{u.errorCount ?? 0}</div>
                    {u.lastErrorAt ? (
                      <div className="text-xs text-muted">{relativeTime(u.lastErrorAt)}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div>{u.totalOcrCount ?? 0}</div>
                    <div className="text-xs text-muted">free: {u.freeOcrScansUsed ?? 0}</div>
                    {u.lastOcrAt ? (
                      <div className="text-xs text-muted">last {relativeTime(u.lastOcrAt)}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <SubscriptionCell user={u} />
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-muted">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3 align-top text-xs text-muted">
                    {u.lastSignInAt ? relativeTime(u.lastSignInAt) : "-"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted">
                    {q.trim() ? `No users match “${q.trim()}”.` : "No users on file."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-faint">{label}</div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value.toLocaleString()}</div>
      <div className="mt-1 text-xs text-muted">{detail}</div>
    </div>
  );
}

function AccountFlags({ user }: { user: AdminUserRow }) {
  const showFlags =
    user.disabled ||
    !user.hasProfile ||
    (user.hasProfile && !user.onboardingCompleted) ||
    Boolean(user.email && !user.emailVerified);

  if (!showFlags) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {user.disabled ? (
        <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-danger">
          Disabled
        </span>
      ) : null}
      {!user.hasProfile ? (
        <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-danger">
          Profile missing
        </span>
      ) : !user.onboardingCompleted ? (
        <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning">
          Setup incomplete
        </span>
      ) : null}
      {user.email && !user.emailVerified ? (
        <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
          Email unverified
        </span>
      ) : null}
    </div>
  );
}

function SubscriptionCell({ user }: { user: AdminUserRow }) {
  if (!user.isPremium) return <span className="text-xs text-muted">Free</span>;

  const details = subscriptionDetails(user);
  return (
    <div className="min-w-[170px]">
      <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-bold uppercase tracking-wider text-primary-dark">
        {planLabel(true, user.planCadence)}
      </span>
      {details ? <div className="mt-2 text-xs text-muted">{details}</div> : null}
    </div>
  );
}

function subscriptionDetails(user: AdminUserRow): string {
  const parts: string[] = [];
  const periodType = user.premiumPeriodType?.toUpperCase();
  if (periodType === "TRIAL") parts.push("Trial");
  else if (periodType === "INTRO") parts.push("Intro offer");

  if (user.premiumExpiresAt) {
    const date = fmtDate(user.premiumExpiresAt);
    if (user.premiumWillRenew === true) parts.push(`Renews ${date}`);
    else if (user.premiumWillRenew === false) parts.push(`Ends ${date}`);
    else parts.push(`Through ${date}`);
  } else if (user.premiumWillRenew === false) {
    parts.push("Not renewing");
  }

  if (user.planCadence === "unknown") parts.push("Cadence unavailable");
  const store = premiumStoreLabel(user.premiumStore);
  if (store) parts.push(store);
  return parts.join(" · ");
}

function SortableTh({
  label,
  sortKey,
  active,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const isActive = active === sortKey;
  const arrow = isActive ? (dir === "asc" ? "↑" : "↓") : "↕";
  return (
    <th
      className="whitespace-nowrap px-4 py-3 text-left font-semibold"
      aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 ${
          isActive ? "text-foreground" : "text-faint hover:text-foreground"
        }`}
      >
        <span>{label}</span>
        <span className="text-[10px]" aria-hidden="true">
          {arrow}
        </span>
      </button>
    </th>
  );
}

function compareUsers(a: AdminUserRow, b: AdminUserRow, key: SortKey, dir: "asc" | "desc") {
  const m = dir === "asc" ? 1 : -1;

  if (key === "displayName") {
    const av = (a.displayName || a.email || a.id).toLowerCase();
    const bv = (b.displayName || b.email || b.id).toLowerCase();
    return av.localeCompare(bv) * m;
  }

  if (key === "subscription") {
    const rank = (user: AdminUserRow) => {
      if (!user.isPremium) return 0;
      if (user.planCadence === "unknown") return 1;
      if (user.planCadence === "monthly") return 2;
      return 3;
    };
    const av = rank(a);
    const bv = rank(b);
    return (av - bv) * m;
  }

  if (key === "createdAt" || key === "lastSignInAt") {
    const av = a[key] ? new Date(a[key] as string).getTime() : 0;
    const bv = b[key] ? new Date(b[key] as string).getTime() : 0;
    return (av - bv) * m;
  }

  const av = Number(a[key] ?? 0);
  const bv = Number(b[key] ?? 0);
  return (av - bv) * m;
}
