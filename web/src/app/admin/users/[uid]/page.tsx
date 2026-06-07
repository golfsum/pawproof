"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { getIdToken } from "@/lib/auth-context";
import { requireAuth } from "@/lib/firebase";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UserDetail {
  id: string;
  email: string | null;
  displayName: string | null;
  isPremium: boolean;
  freeOcrScansUsed?: number;
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
      setError("This account has no email (likely Apple private-relay or social-only).");
      return;
    }
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      // Uses Firebase's built-in reset email — no custom mail service needed.
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
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8">
      <Link
        href="/admin/users"
        className="text-sm text-primary font-semibold hover:underline"
      >
        ← All users
      </Link>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      {!data ? (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          Loading…
        </div>
      ) : (
        <>
          <header className="mt-4 rounded-2xl border border-border bg-surface p-5">
            <h1 className="text-2xl font-bold">
              {data.displayName || data.email || data.id}
            </h1>
            <div className="mt-1 text-sm text-muted">
              {data.email ?? "no email"} · {data.id}
            </div>
            <div className="mt-4 flex gap-2 flex-wrap">
              {data.isPremium ? (
                <span className="rounded-full bg-primary-soft text-primary-dark text-xs font-bold uppercase tracking-wider px-2 py-1">
                  Plus
                </span>
              ) : (
                <span className="rounded-full bg-surface-elevated text-muted text-xs font-bold uppercase tracking-wider px-2 py-1">
                  Free
                </span>
              )}
              {data.disabled ? (
                <span className="rounded-full bg-danger-soft text-danger text-xs font-bold uppercase tracking-wider px-2 py-1">
                  Disabled
                </span>
              ) : null}
            </div>
            <div className="mt-4 flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={togglePremium} disabled={busy}>
                {data.isPremium ? "Revoke Plus" : "Grant Plus"}
              </Button>
              <Button variant="outline" size="sm" onClick={sendPasswordReset} disabled={busy || !data.email}>
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

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Stat label="Pets" value={data.pets.length} />
            <Stat label="Vaccines" value={data.vaccineCount} />
            <Stat label="Documents" value={data.documentCount} />
            <Stat label="Reminders" value={data.reminderCount} />
            <Stat label="Journal entries" value={data.entryCount} />
            <Stat label="Support tickets" value={data.ticketCount} />
          </div>

          <section className="mt-8">
            <h2 className="font-semibold mb-3">Account dates</h2>
            <dl className="rounded-2xl border border-border bg-surface p-4 text-sm grid gap-2">
              <Row label="Created" value={fmtDateTime(data.createdAt)} />
              <Row
                label="Last sign-in"
                value={data.lastSignInAt ? fmtDateTime(data.lastSignInAt) : "-"}
              />
              <Row label="Free OCR scans used" value={String(data.freeOcrScansUsed ?? 0)} />
            </dl>
          </section>

          <RecordSection
            title="Pets"
            count={data.pets.length}
            empty="This user hasn't added any pets."
            rows={data.pets.map((p) => ({
              id: p.id,
              primary: p.name,
              secondary: [
                p.species,
                p.breed ?? undefined,
                p.birthday ? `born ${fmtDate(p.birthday)}` : undefined,
              ]
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
            <h2 className="font-semibold mb-3">People &amp; sharing ({data.shares.length})</h2>
            {data.shares.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong bg-surface p-6 text-center text-sm text-muted">
                This user hasn&apos;t invited anyone.
              </div>
            ) : (
              <ul className="rounded-2xl border border-border bg-surface divide-y divide-divider">
                {data.shares.map((s) => (
                  <li key={s.id} className="px-4 py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{s.inviteeEmail ?? "—"}</div>
                      <div className="text-xs text-muted truncate">
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
                      <div className="text-[11px] text-muted mt-0.5">
                        Invited {s.createdAt ? fmtDateTime(s.createdAt) : "—"}
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
            <h2 className="font-semibold mb-3">Tickets ({data.ticketCount})</h2>
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
      <div className="text-xs text-muted mt-0.5">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-1.5 border-b border-divider last:border-0">
      <dt className="w-40 text-muted shrink-0">{label}</dt>
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
      <h2 className="font-semibold mb-3">
        {title} ({count})
      </h2>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong bg-surface p-6 text-center text-sm text-muted">
          {empty}
        </div>
      ) : (
        <ul className="rounded-2xl border border-border bg-surface divide-y divide-divider">
          {rows.map((r) => (
            <li key={r.id} className="px-4 py-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-semibold truncate">{r.primary}</div>
                {r.secondary ? (
                  <div className="text-xs text-muted capitalize truncate">{r.secondary}</div>
                ) : null}
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-muted">
                  {r.createdAt ? fmtDateTime(r.createdAt) : "—"}
                </div>
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
