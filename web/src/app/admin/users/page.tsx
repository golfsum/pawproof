"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getIdToken } from "@/lib/auth-context";
import { fmtDate, relativeTime } from "@/lib/utils";

interface AdminUserRow {
  id: string;
  email: string | null;
  displayName: string | null;
  isPremium: boolean;
  disabled?: boolean;
  freeOcrScansUsed?: number;
  totalOcrCount?: number;
  lastOcrAt?: string | null;
  petCount?: number;
  ticketCount?: number;
  errorCount?: number;
  lastErrorAt?: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
}

type SortKey =
  | "displayName"
  | "petCount"
  | "ticketCount"
  | "errorCount"
  | "totalOcrCount"
  | "isPremium"
  | "createdAt"
  | "lastSignInAt"
  | "lastOcrAt";

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
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = needle
      ? users.filter((u) =>
          [u.email, u.displayName, u.id]
            .filter(Boolean)
            .some((s) => s!.toLowerCase().includes(needle)),
        )
      : users;
    return [...base].sort((a, b) => compareUsers(a, b, sortKey, sortDir));
  }, [users, q, sortKey, sortDir]);

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "displayName" ? "asc" : "desc");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted">
            {users.length} {users.length === 1 ? "user" : "users"} on file. Sorted by sign-up
            date by default.
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email, name, UID..."
          className="w-72 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm focus:outline-2 focus:outline-primary"
        />
      </div>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      {loading ? (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          Loading...
        </div>
      ) : (
        <div className="mt-6 overflow-auto rounded-2xl border border-border bg-surface">
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
                  label="Plan"
                  sortKey="isPremium"
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
                <SortableTh
                  label="Last OCR"
                  sortKey="lastOcrAt"
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
                    {u.disabled ? (
                      <span className="mt-2 inline-block rounded-full bg-danger-soft px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-danger">
                        Disabled
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top">{u.petCount ?? 0}</td>
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
                  </td>
                  <td className="px-4 py-3 align-top">
                    {u.isPremium ? (
                      <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-bold uppercase tracking-wider text-primary-dark">
                        Plus
                      </span>
                    ) : (
                      <span className="text-xs text-muted">Free</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-muted">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3 align-top text-xs text-muted">
                    {u.lastSignInAt ? relativeTime(u.lastSignInAt) : "-"}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-muted">
                    {u.lastOcrAt ? relativeTime(u.lastOcrAt) : "-"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted">
                    No users match.
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
    <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 ${
          isActive ? "text-foreground" : "text-faint hover:text-foreground"
        }`}
      >
        <span>{label}</span>
        <span className="text-[10px]">{arrow}</span>
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

  if (key === "isPremium") {
    const av = a.isPremium ? 1 : 0;
    const bv = b.isPremium ? 1 : 0;
    return (av - bv) * m;
  }

  if (key === "createdAt" || key === "lastSignInAt" || key === "lastOcrAt") {
    const av = a[key] ? new Date(a[key] as string).getTime() : 0;
    const bv = b[key] ? new Date(b[key] as string).getTime() : 0;
    return (av - bv) * m;
  }

  const av = Number(a[key] ?? 0);
  const bv = Number(b[key] ?? 0);
  return (av - bv) * m;
}
