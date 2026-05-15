"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
import { fmtDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function AdminTicketDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const [issue, setIssue] = useState<SupportIssue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`/api/admin/tickets/${id}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Could not load ticket.");
      const body = await res.json();
      setIssue(body.issue);
      setNote(body.issue?.adminNote ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load.");
    }
  }, [id]);

  useEffect(() => {
    if (id) void load();
  }, [id, load]);

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`/api/admin/tickets/${id}/reply`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: reply.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not send reply.");
      }
      setReply("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reply.");
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`/api/admin/tickets/${id}/note`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error("Could not save note.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save note.");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: IssueStatus) => {
    setBusy(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`/api/admin/tickets/${id}/status`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Could not update status.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-8 py-8">
      <Link
        href="/admin/tickets"
        className="text-sm text-primary font-semibold hover:underline"
      >
        ← All tickets
      </Link>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      {!issue ? (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          Loading…
        </div>
      ) : (
        <>
          <header className="mt-4 rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${STATUS_TONES[issue.status]}`}
                >
                  {STATUS_LABELS[issue.status]}
                </span>
                <h1 className="text-lg font-bold">
                  {CATEGORY_LABELS[issue.category as IssueCategory] ?? issue.category}
                </h1>
              </div>
              <div className="flex gap-2">
                {ISSUE_STATUSES.map((s) =>
                  s === issue.status ? null : (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => setStatus(s)}
                    >
                      Mark {STATUS_LABELS[s]}
                    </Button>
                  ),
                )}
              </div>
            </div>

            <dl className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <Row label="User">
                <Link
                  href={`/admin/users/${issue.uid}`}
                  className="text-primary font-semibold hover:underline"
                >
                  {issue.displayName || issue.email || issue.uid}
                </Link>
              </Row>
              <Row label="Email">{issue.email ?? "—"}</Row>
              <Row label="Platform">
                {issue.platform ?? "—"} · {issue.appVersion ?? ""}
                {issue.buildNumber ? ` (build ${issue.buildNumber})` : ""}
              </Row>
              <Row label="Device">{issue.deviceModel ?? "—"}</Row>
              <Row label="Source">{issue.source}</Row>
              <Row label="Opened">{fmtDateTime(issue.createdAt)}</Row>
            </dl>

            <p className="mt-4 text-sm whitespace-pre-wrap text-foreground">
              {issue.message}
            </p>
          </header>

          {issue.context ? (
            <details className="mt-4 rounded-2xl border border-border bg-surface p-4 text-sm">
              <summary className="cursor-pointer font-semibold">App context</summary>
              <pre className="mt-3 text-xs overflow-auto bg-surface-elevated p-3 rounded-lg">
                {JSON.stringify(issue.context, null, 2)}
              </pre>
            </details>
          ) : null}

          {issue.lastError ? (
            <details className="mt-4 rounded-2xl border border-danger/40 bg-danger-soft/30 p-4 text-sm">
              <summary className="cursor-pointer font-semibold text-danger">
                Recent client error
              </summary>
              <div className="mt-3 text-xs">
                <div className="font-mono">{issue.lastError.message}</div>
                {issue.lastError.stack ? (
                  <pre className="mt-2 overflow-auto bg-surface-elevated p-3 rounded-lg whitespace-pre-wrap">
                    {issue.lastError.stack}
                  </pre>
                ) : null}
              </div>
            </details>
          ) : null}

          <section className="mt-6">
            <h2 className="font-semibold mb-3">Conversation</h2>
            <div className="space-y-3">
              {issue.thread.length === 0 ? (
                <p className="text-sm text-muted text-center py-4">No replies yet.</p>
              ) : (
                issue.thread.map((m, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl p-4 ${
                      m.from === "admin"
                        ? "bg-primary-soft border border-primary/30"
                        : "bg-surface border border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-faint">
                        {m.from === "admin" ? `Admin · ${m.byEmail ?? ""}` : "User"}
                      </span>
                      <span className="text-xs text-muted">{fmtDateTime(m.createdAt)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <form
            onSubmit={sendReply}
            className="mt-6 rounded-2xl border border-border bg-surface p-4 grid gap-3"
          >
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Reply to user</span>
              <textarea
                rows={4}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                maxLength={4000}
                className="rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm focus:outline-2 focus:outline-primary"
              />
            </label>
            <div className="flex justify-end">
              <Button type="submit" disabled={busy || !reply.trim()}>
                {busy ? "Sending…" : "Send reply"}
              </Button>
            </div>
          </form>

          <div className="mt-6 rounded-2xl border border-warning/40 bg-warning-soft/30 p-4">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Internal note (not visible to user)</span>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={4000}
                className="rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm focus:outline-2 focus:outline-warning"
              />
            </label>
            <div className="mt-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={saveNote} disabled={busy}>
                Save note
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-0.5">
      <dt className="text-muted w-24 shrink-0">{label}</dt>
      <dd className="break-all">{children}</dd>
    </div>
  );
}
