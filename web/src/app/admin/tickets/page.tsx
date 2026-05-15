"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getIdToken } from "@/lib/auth-context";
import {
  CATEGORY_LABELS,
  ISSUE_STATUSES,
  STATUS_LABELS,
  STATUS_TONES,
  type IssueCategory,
  type IssueStatus,
  type SupportIssue,
} from "@/lib/support";
import { relativeTime } from "@/lib/utils";

export default function AdminTicketsPage() {
  const params = useSearchParams();
  const filterUid = params.get("uid") ?? "";
  const [issues, setIssues] = useState<SupportIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<IssueStatus | "all">("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/tickets?${params.toString()}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Could not load tickets.");
      const body = await res.json();
      setIssues(body.issues ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = issues.filter((i) => {
    if (filterUid && i.uid !== filterUid) return false;
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return [
      i.email,
      i.displayName,
      i.message,
      i.category,
      i.uid,
    ]
      .filter(Boolean)
      .some((s) => String(s).toLowerCase().includes(needle));
  });

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
          <p className="mt-1 text-muted text-sm">
            All support requests across users.{" "}
            {filterUid ? (
              <>
                Filtered to UID <span className="font-mono">{filterUid}</span>.{" "}
                <Link className="text-primary font-semibold" href="/admin/tickets">Clear</Link>
              </>
            ) : null}
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm focus:outline-2 focus:outline-primary w-64"
        />
      </div>

      <div className="mt-4 flex gap-2 flex-wrap">
        <FilterPill
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        >
          All
        </FilterPill>
        {ISSUE_STATUSES.map((s) => (
          <FilterPill
            key={s}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          >
            {STATUS_LABELS[s]}
          </FilterPill>
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      {loading ? (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          Loading…
        </div>
      ) : (
        <ul className="mt-6 rounded-2xl border border-border bg-surface divide-y divide-divider">
          {filtered.map((t) => (
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
                  <div className="font-semibold text-sm truncate">
                    {CATEGORY_LABELS[t.category as IssueCategory] ?? t.category}
                  </div>
                  <div className="text-xs text-muted line-clamp-1">{t.message}</div>
                  <div className="text-[11px] text-faint mt-0.5">
                    {t.email ?? "no email"} · {t.platform ?? "-"} · {t.appVersion ?? ""}
                  </div>
                </div>
                <div className="text-xs text-faint shrink-0">
                  {relativeTime(t.updatedAt)}
                </div>
              </Link>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-muted">
              No tickets match.
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${
        active
          ? "bg-primary text-white"
          : "bg-surface border border-border text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
