"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getIdToken } from "@/lib/auth-context";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  STATUS_TONES,
  type IssueCategory,
  type SupportIssue,
} from "@/lib/support";
import { fmtDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function TicketDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const [issue, setIssue] = useState<SupportIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      const res = await fetch(`/api/support/issues/${id}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Could not load ticket.");
      const body = await res.json();
      setIssue(body.issue);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load ticket.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) void load();
  }, [id, load]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      const res = await fetch(`/api/support/issues/${id}/reply`, {
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

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 py-8">
      <Link
        href="/dashboard/support"
        className="text-sm text-primary font-semibold hover:underline"
      >
        ← All tickets
      </Link>

      {loading ? (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          Loading…
        </div>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-danger bg-danger-soft p-6 text-sm text-danger">
          {error}
        </div>
      ) : issue ? (
        <>
          <header className="mt-4 rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${STATUS_TONES[issue.status]}`}>
                {STATUS_LABELS[issue.status]}
              </span>
              <span className="text-xs text-muted">
                Opened {fmtDateTime(issue.createdAt)}
              </span>
            </div>
            <h1 className="mt-3 text-xl font-bold">
              {CATEGORY_LABELS[issue.category as IssueCategory] ?? issue.category}
            </h1>
            <p className="mt-3 text-sm whitespace-pre-wrap text-foreground">
              {issue.message}
            </p>
          </header>

          <section className="mt-6 space-y-3">
            {issue.thread.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">
                No replies yet. We&apos;ll be in touch.
              </p>
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
                      {m.from === "admin" ? "PawProof support" : "You"}
                    </span>
                    <span className="text-xs text-muted">{fmtDateTime(m.createdAt)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                </div>
              ))
            )}
          </section>

          {issue.status !== "completed" || issue.thread.length > 0 ? (
            <form onSubmit={send} className="mt-6 rounded-2xl border border-border bg-surface p-4 grid gap-3">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Reply</span>
                <textarea
                  rows={4}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  maxLength={4000}
                  placeholder="Add more detail or respond to our note…"
                  className="rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm focus:outline-2 focus:outline-primary"
                />
              </label>
              <div className="flex justify-end">
                <Button type="submit" disabled={busy || !reply.trim()}>
                  {busy ? "Sending…" : "Send reply"}
                </Button>
              </div>
            </form>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
