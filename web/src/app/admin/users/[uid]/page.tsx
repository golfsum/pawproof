"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { getIdToken } from "@/lib/auth-context";
import { requireAuth } from "@/lib/firebase";
import { fmtDate, fmtDateTime } from "@/lib/utils";

interface UserDetail {
  id: string;
  email: string | null;
  displayName: string | null;
  isPremium: boolean;
  freeOcrScansUsed?: number;
  totalOcrCount?: number;
  totalOcrImageBytes?: number;
  lastOcrAt?: string | null;
  errorCount?: number;
  errors?: Array<{
    issueId: string;
    category: string;
    ticketMessage: string;
    updatedAt: string | null;
    error: {
      message: string;
      name: string | null;
      stack: string | null;
      args: string | null;
      createdAt: string | null;
    };
  }>;
  createdAt: string | null;
  lastSignInAt: string | null;
  disabled?: boolean;
  pets: Array<{
    id: string;
    name: string;
    species: string;
    breed?: string | null;
    birthday?: string | null;
    createdAt: string | null;
    createdBy: string;
  }>;
  vaccines: Array<{
    id: string;
    vaccineName: string;
    petName: string | null;
    dateGiven: string | null;
    createdAt: string | null;
    createdBy: string;
  }>;
  documents: Array<{
    id: string;
    title: string;
    kind: string | null;
    petName: string | null;
    createdAt: string | null;
    createdBy: string;
  }>;
  reminders: Array<{
    id: string;
    title: string;
    type: string | null;
    petName: string | null;
    dueDate: string | null;
    createdAt: string | null;
    createdBy: string;
  }>;
  entries: Array<{
    id: string;
    type: string;
    title: string;
    petName: string | null;
    timestamp: string | null;
    createdAt: string | null;
    createdBy: string;
  }>;
  shares: Array<{
    id: string;
    inviteeEmail: string | null;
    inviteeUid: string | null;
    petName: string | null;
    role: string;
    status: string;
    createdAt: string | null;
    acceptedAt: string | null;
    revokedAt: string | null;
    activityCount: number;
  }>;
  ticketCount: number;
  vaccineCount: number;
  documentCount: number;
  reminderCount: number;
  entryCount: number;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const uid = String(params?.uid ?? "");
  const [data, setData] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`/api/admin/users/${uid}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Could not load user.");
      const body = await res.json();
      setData(body.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load.");
    }
  }, [uid]);

  useEffect(() => {
    if (uid) void load();
  }, [uid, load]);

  const togglePremium = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPremium: !data.isPremium }),
      });
      if (!res.ok) throw new Error("Could not update.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!data?.email) {
      setError("This account has no email (likely Apple private relay or social-only).");
      return;
    }
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await sendPasswordResetEmail(requireAuth(), data.email);
      setNotice(`Password reset email sent to ${data.email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  };

  const deleteUser = async () => {
    if (!data) return;
    const label = data.email ?? data.id;
    if (!window.confirm(`Permanently delete ${label} and ALL their data? This cannot be undone.`)) {
      return;
    }
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Could not delete user.");
      }
      router.push("/admin/users");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete user.");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <Link href="/admin/users" className="text-sm font-semibold text-primary hover:underline">
        ← All users
      </Link>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      {!data ? (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          Loading...
        </div>
      ) : (
        <>
          <header className="mt-4 rounded-2xl border border-border bg-surface p-5">
            <h1 className="text-2xl font-bold">{data.displayName || data.email || data.id}</h1>
            <div className="mt-1 text-sm text-muted">
              {data.email ?? "no email"} · {data.id}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.isPremium ? (
                <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-bold uppercase tracking-wider text-primary-dark">
                  Plus
                </span>
              ) : (
                <span className="rounded-full bg-surface-elevated px-2 py-1 text-xs font-bold uppercase tracking-wider text-muted">
                  Free
                </span>
              )}
              {data.disabled ? (
                <span className="rounded-full bg-danger-soft px-2 py-1 text-xs font-bold uppercase tracking-wider text-danger">
                  Disabled
                </span>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={togglePremium} disabled={busy}>
                {data.isPremium ? "Revoke Plus" : "Grant Plus"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={sendPasswordReset}
                disabled={busy || !data.email}
              >
                Send password reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deleteUser}
                disabled={busy}
                className="border-danger text-danger hover:bg-danger-soft"
              >
                Delete user
              </Button>
            </div>
            {notice ? <p className="mt-3 text-sm text-primary">{notice}</p> : null}
          </header>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Pets" value={data.pets.length} />
            <Stat label="Vaccines" value={data.vaccineCount} />
            <Stat label="Documents" value={data.documentCount} />
            <Stat label="Reminders" value={data.reminderCount} />
            <Stat label="Journal entries" value={data.entryCount} />
            <Stat label="Support tickets" value={data.ticketCount} />
            <Stat label="Tracked OCR uses" value={data.totalOcrCount ?? 0} />
            <Stat label="Stored client errors" value={data.errorCount ?? 0} />
          </div>

          <section className="mt-8">
            <h2 className="mb-3 font-semibold">Account dates</h2>
            <dl className="grid gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
              <Row label="Created" value={fmtDateTime(data.createdAt)} />
              <Row label="Last sign-in" value={data.lastSignInAt ? fmtDateTime(data.lastSignInAt) : "-"} />
              <Row label="Last OCR" value={data.lastOcrAt ? fmtDateTime(data.lastOcrAt) : "-"} />
              <Row label="Tracked OCR uses" value={String(data.totalOcrCount ?? 0)} />
              <Row label="Free OCR scans used" value={String(data.freeOcrScansUsed ?? 0)} />
              <Row
                label="OCR image volume"
                value={formatBytes(data.totalOcrImageBytes ?? 0)}
              />
            </dl>
          </section>

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="font-semibold">Errors ({data.errorCount ?? 0})</h2>
              {data.ticketCount ? (
                <Link
                  href={`/admin/tickets?uid=${data.id}`}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Filter ticket queue to this user →
                </Link>
              ) : null}
            </div>
            {(data.errors?.length ?? 0) === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong bg-surface p-6 text-center text-sm text-muted">
                No stored client errors for this user.
              </div>
            ) : (
              <ul className="divide-y divide-divider rounded-2xl border border-border bg-surface">
                {data.errors!.map((item) => (
                  <li key={`${item.issueId}-${item.error.createdAt ?? item.updatedAt ?? "error"}`} className="px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground">
                          {item.error.name ? `${item.error.name}: ` : ""}
                          {item.error.message}
                        </div>
                        <div className="mt-1 text-xs text-muted">
                          {item.category} · ticket updated{" "}
                          {item.updatedAt ? fmtDateTime(item.updatedAt) : "-"}
                        </div>
                        {item.ticketMessage ? (
                          <div className="mt-2 text-sm text-muted">{item.ticketMessage}</div>
                        ) : null}
                      </div>
                      <Link
                        href={`/admin/tickets/${item.issueId}`}
                        className="shrink-0 text-sm font-semibold text-primary hover:underline"
                      >
                        Open ticket
                      </Link>
                    </div>
                    {item.error.args ? (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-faint">
                          Error args
                        </summary>
                        <pre className="mt-2 overflow-auto rounded-xl bg-surface-elevated p-3 text-xs text-muted">
                          {item.error.args}
                        </pre>
                      </details>
                    ) : null}
                    {item.error.stack ? (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-faint">
                          Stack trace
                        </summary>
                        <pre className="mt-2 overflow-auto rounded-xl bg-surface-elevated p-3 text-xs text-muted">
                          {item.error.stack}
                        </pre>
                      </details>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <RecordSection
            title="Pets"
            count={data.pets.length}
            empty="This user hasn't added any pets."
            rows={data.pets.map((p) => ({
              id: p.id,
              primary: p.name,
              secondary: [p.species, p.breed ?? undefined, p.birthday ? `born ${fmtDate(p.birthday)}` : undefined]
                .filter(Boolean)
                .join(" · "),
              createdAt: p.createdAt,
              createdBy: p.createdBy,
            }))}
          />

          <RecordSection
            title="Vaccines"
            count={data.vaccineCount}
            empty="No vaccine records."
            rows={data.vaccines.map((v) => ({
              id: v.id,
              primary: v.vaccineName,
              secondary: [v.petName ?? undefined, v.dateGiven ? `given ${fmtDate(v.dateGiven)}` : undefined]
                .filter(Boolean)
                .join(" · "),
              createdAt: v.createdAt,
              createdBy: v.createdBy,
            }))}
          />

          <RecordSection
            title="Documents"
            count={data.documentCount}
            empty="No documents uploaded."
            rows={data.documents.map((d) => ({
              id: d.id,
              primary: d.title,
              secondary: [d.kind ?? undefined, d.petName ?? undefined].filter(Boolean).join(" · "),
              createdAt: d.createdAt,
              createdBy: d.createdBy,
            }))}
          />

          <RecordSection
            title="Reminders"
            count={data.reminderCount}
            empty="No reminders."
            rows={data.reminders.map((r) => ({
              id: r.id,
              primary: r.title,
              secondary: [
                r.type ?? undefined,
                r.petName ?? undefined,
                r.dueDate ? `due ${fmtDateTime(r.dueDate)}` : undefined,
              ]
                .filter(Boolean)
                .join(" · "),
              createdAt: r.createdAt,
              createdBy: r.createdBy,
            }))}
          />

          <RecordSection
            title="Journal entries"
            count={data.entryCount}
            empty="No journal entries."
            rows={data.entries.map((e) => ({
              id: e.id,
              primary: e.title || e.type,
              secondary: [e.type, e.petName ?? undefined, e.timestamp ? fmtDateTime(e.timestamp) : undefined]
                .filter(Boolean)
                .join(" · "),
              createdAt: e.createdAt,
              createdBy: e.createdBy,
            }))}
          />

          <section className="mt-8">
            <h2 className="mb-3 font-semibold">People &amp; sharing ({data.shares.length})</h2>
            {data.shares.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong bg-surface p-6 text-center text-sm text-muted">
                This user hasn't invited anyone.
              </div>
            ) : (
              <ul className="divide-y divide-divider rounded-2xl border border-border bg-surface">
                {data.shares.map((s) => (
                  <li key={s.id} className="flex items-start justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{s.inviteeEmail ?? "-"}</div>
                      <div className="truncate text-xs text-muted">
                        {[
                          s.petName ? `Pet: ${s.petName}` : null,
                          s.role === "view_only" ? "View only" : "Caregiver",
                          s.status === "accepted"
                            ? `${s.activityCount} ${s.activityCount === 1 ? "log" : "logs"}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted">
                        Invited {s.createdAt ? fmtDateTime(s.createdAt) : "-"}
                        {s.acceptedAt ? ` · Accepted ${fmtDateTime(s.acceptedAt)}` : ""}
                        {s.revokedAt ? ` · Revoked ${fmtDateTime(s.revokedAt)}` : ""}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        s.status === "accepted"
                          ? "bg-primary-soft text-primary-dark"
                          : s.status === "revoked"
                            ? "bg-danger-soft text-danger"
                            : "bg-surface-elevated text-muted"
                      }`}
                    >
                      {s.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-8">
            <h2 className="mb-3 font-semibold">Tickets ({data.ticketCount})</h2>
            <Link
              href={`/admin/tickets?uid=${data.id}`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Filter ticket queue to this user →
            </Link>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 border-b border-divider py-1.5 last:border-0">
      <dt className="w-40 shrink-0 text-muted">{label}</dt>
      <dd className="break-all">{value}</dd>
    </div>
  );
}

interface RecordRow {
  id: string;
  primary: string;
  secondary?: string;
  createdAt: string | null;
  createdBy: string;
}

function RecordSection({
  title,
  count,
  empty,
  rows,
}: {
  title: string;
  count: number;
  empty: string;
  rows: RecordRow[];
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-semibold">
        {title} ({count})
      </h2>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong bg-surface p-6 text-center text-sm text-muted">
          {empty}
        </div>
      ) : (
        <ul className="divide-y divide-divider rounded-2xl border border-border bg-surface">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{r.primary}</div>
                {r.secondary ? <div className="truncate text-xs capitalize text-muted">{r.secondary}</div> : null}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs text-muted">{r.createdAt ? fmtDateTime(r.createdAt) : "-"}</div>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    r.createdBy.startsWith("Caregiver")
                      ? "bg-warning-soft text-warning"
                      : "bg-surface-elevated text-muted"
                  }`}
                >
                  {r.createdBy}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {count > rows.length ? (
        <p className="mt-2 text-xs text-muted">
          Showing {rows.length} of {count} (most recent).
        </p>
      ) : null}
    </section>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
