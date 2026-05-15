"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getIdToken } from "@/lib/auth-context";
import { fmtDate, relativeTime } from "@/lib/utils";

interface AdminUserRow {
  id: string;
  email: string | null;
  displayName: string | null;
  isPremium: boolean;
  freeOcrScansUsed?: number;
  petCount?: number;
  ticketCount?: number;
  createdAt: string | null;
  lastSignInAt: string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

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

  const filtered = q.trim()
    ? users.filter((u) =>
        [u.email, u.displayName, u.id]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(q.toLowerCase())),
      )
    : users;

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-muted text-sm">
            {users.length} {users.length === 1 ? "user" : "users"} on file.
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email, name, UID…"
          className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm focus:outline-2 focus:outline-primary w-72"
        />
      </div>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      {loading ? (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          Loading…
        </div>
      ) : (
        <div className="mt-6 overflow-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-faint bg-surface-elevated">
              <tr>
                <Th>User</Th>
                <Th>Pets</Th>
                <Th>Tickets</Th>
                <Th>OCR used</Th>
                <Th>Plan</Th>
                <Th>Signed up</Th>
                <Th>Last sign-in</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-divider hover:bg-surface-elevated">
                  <td className="px-4 py-3 align-top">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="font-semibold text-foreground hover:text-primary block"
                    >
                      {u.displayName || u.email || u.id}
                    </Link>
                    {u.email && u.email !== u.displayName ? (
                      <div className="text-xs text-muted">{u.email}</div>
                    ) : null}
                    <div className="text-[10px] text-faint font-mono mt-0.5">{u.id}</div>
                  </td>
                  <td className="px-4 py-3 align-top">{u.petCount ?? 0}</td>
                  <td className="px-4 py-3 align-top">{u.ticketCount ?? 0}</td>
                  <td className="px-4 py-3 align-top">{u.freeOcrScansUsed ?? 0}</td>
                  <td className="px-4 py-3 align-top">
                    {u.isPremium ? (
                      <span className="rounded-full bg-primary-soft text-primary-dark text-xs font-bold uppercase tracking-wider px-2 py-1">
                        Plus
                      </span>
                    ) : (
                      <span className="text-xs text-muted">Free</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-muted">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3 align-top text-xs text-muted">
                    {u.lastSignInAt ? relativeTime(u.lastSignInAt) : "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
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

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left font-semibold">{children}</th>;
}
