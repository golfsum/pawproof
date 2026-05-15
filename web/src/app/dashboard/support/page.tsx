"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getIdToken } from "@/lib/auth-context";
import {
  CATEGORY_LABELS,
  ISSUE_CATEGORIES,
  STATUS_LABELS,
  STATUS_TONES,
  type IssueCategory,
  type SupportIssue,
} from "@/lib/support";
import { relativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function SupportPage() {
  const [issues, setIssues] = useState<SupportIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch("/api/support/issues", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Could not load tickets.");
      const body = await res.json();
      setIssues(body.issues ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load tickets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-8 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support</h1>
          <p className="mt-1 text-muted text-sm max-w-xl">
            Report bugs, ask questions, or send feedback. We read every
            ticket. For account or billing questions, email{" "}
            <a href="mailto:support@pawproof.app" className="text-primary font-semibold">
              support@pawproof.app
            </a>
            .
          </p>
        </div>
        <Button onClick={() => setShowNew((v) => !v)}>
          {showNew ? "Cancel" : "New ticket"}
        </Button>
      </div>

      {showNew ? (
        <NewTicketForm
          onSubmitted={() => {
            setShowNew(false);
            void reload();
          }}
        />
      ) : null}

      <div className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-faint mb-3">
          Your tickets
        </h2>
        {error ? <p className="text-sm text-danger mb-3">{error}</p> : null}
        {loading ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
            Loading…
          </div>
        ) : issues.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-strong bg-surface p-10 text-center">
            <h3 className="font-semibold">No tickets yet</h3>
            <p className="mt-2 text-sm text-muted">
              Use New ticket above when you need help.
            </p>
          </div>
        ) : (
          <ul className="rounded-2xl border border-border bg-surface divide-y divide-divider">
            {issues.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/dashboard/support/${i.id}`}
                  className="flex items-start gap-4 px-4 py-3 hover:bg-surface-elevated transition"
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${STATUS_TONES[i.status]}`}>
                    {STATUS_LABELS[i.status]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {CATEGORY_LABELS[i.category as IssueCategory] ?? i.category}
                    </div>
                    <div className="text-xs text-muted line-clamp-1">{i.message}</div>
                  </div>
                  <div className="text-xs text-faint shrink-0">{relativeTime(i.updatedAt)}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function NewTicketForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [category, setCategory] = useState<IssueCategory>("app_bug");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      const res = await fetch("/api/support/issues", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          message,
          source: "web-support",
          platform: "web",
          appVersion: null,
          buildNumber: null,
          deviceModel: navigator.userAgent.slice(0, 128),
          context: null,
          lastError: null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not submit ticket.");
      }
      setMessage("");
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit ticket.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-6 rounded-2xl border border-border bg-surface p-5 grid gap-4"
    >
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">What's the problem?</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as IssueCategory)}
          className="rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm focus:outline-2 focus:outline-primary"
        >
          {ISSUE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Tell us what happened</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          required
          minLength={3}
          maxLength={4000}
          placeholder="Steps to reproduce, what you expected, what happened instead…"
          className="rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm focus:outline-2 focus:outline-primary"
        />
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={busy || message.trim().length < 3}>
          {busy ? "Sending…" : "Submit ticket"}
        </Button>
      </div>
    </form>
  );
}
