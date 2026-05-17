"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CircleAlert, Plus } from "lucide-react";
import { getIdToken } from "@/lib/auth-context";
import {
  CATEGORY_LABELS,
  ISSUE_CATEGORIES,
  STATUS_LABELS,
  type IssueCategory,
  type SupportIssue,
} from "@/lib/support";
import { relativeTime } from "@/lib/utils";
import {
  Card,
  Chip,
  EmptyCard,
  PageTitle,
  SectionLabel,
} from "@/components/app-ui";

// Support — list of the user's tickets, with the new-ticket form
// inline. Same iOS card styling so it slots cleanly between the
// other dashboard tabs.

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
    <>
      <PageTitle
        title="Support"
        subtitle="Report bugs, ask questions, or send feedback. We read every ticket."
      />

      <button
        type="button"
        onClick={() => setShowNew((v) => !v)}
        className="new-ticket-btn"
      >
        <Plus size={16} />
        {showNew ? "Cancel" : "New ticket"}
        <style jsx>{`
          .new-ticket-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 10px 16px;
            border-radius: 999px;
            background: #2a8fa8;
            color: #fff;
            font-size: 14px;
            font-weight: 600;
            border: none;
            cursor: pointer;
            transition: transform 120ms ease;
          }
          .new-ticket-btn:active {
            transform: scale(0.97);
          }
        `}</style>
      </button>

      {showNew ? (
        <NewTicketForm
          onSubmitted={() => {
            setShowNew(false);
            void reload();
          }}
        />
      ) : null}

      <SectionLabel>Your tickets</SectionLabel>

      {error ? (
        <Card>
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#ba1a1a" }}>
            <CircleAlert size={16} />
            <span style={{ fontSize: 13 }}>{error}</span>
          </div>
        </Card>
      ) : loading ? (
        <EmptyCard title="Loading…" body="Fetching your tickets." />
      ) : issues.length === 0 ? (
        <EmptyCard
          title="No tickets yet"
          body="Use New ticket above when you need help."
        />
      ) : (
        <Card noPadding>
          {issues.map((i) => (
            <Link key={i.id} href={`/dashboard/support/${i.id}`} className="ticket-row">
              <div className="ticket-row-inner">
                <Chip
                  label={STATUS_LABELS[i.status]}
                  tone={
                    i.status === "open"
                      ? "warning"
                      : i.status === "in_review"
                        ? "neutral"
                        : "success"
                  }
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ticket-title">
                    {CATEGORY_LABELS[i.category as IssueCategory] ?? i.category}
                  </div>
                  <div className="ticket-sub">{i.message}</div>
                </div>
                <div className="ticket-time">{relativeTime(i.updatedAt)}</div>
              </div>
              <style jsx>{`
                .ticket-row {
                  display: block;
                  color: inherit;
                  text-decoration: none;
                }
                .ticket-row + .ticket-row .ticket-row-inner {
                  border-top: 0.5px solid rgba(60, 60, 67, 0.18);
                }
                .ticket-row-inner {
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  padding: 14px 16px;
                }
                .ticket-title {
                  font-size: 14px;
                  font-weight: 600;
                  color: #16252e;
                }
                .ticket-sub {
                  font-size: 12px;
                  color: rgba(60, 60, 67, 0.6);
                  margin-top: 2px;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  display: -webkit-box;
                  -webkit-line-clamp: 1;
                  -webkit-box-orient: vertical;
                }
                .ticket-time {
                  font-size: 11px;
                  color: rgba(60, 60, 67, 0.6);
                  flex-shrink: 0;
                }
              `}</style>
            </Link>
          ))}
        </Card>
      )}
    </>
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
    <form onSubmit={submit} className="new-form">
      <label>
        <div className="label">What's the problem?</div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as IssueCategory)}
          className="input"
        >
          {ISSUE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <div className="label">Tell us what happened</div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          required
          minLength={3}
          maxLength={4000}
          placeholder="Steps to reproduce, what you expected, what happened instead…"
          className="input"
        />
      </label>
      {error ? <div className="err">{error}</div> : null}
      <button
        type="submit"
        disabled={busy || message.trim().length < 3}
        className="submit"
      >
        {busy ? "Sending…" : "Submit ticket"}
      </button>

      <style jsx>{`
        .new-form {
          background: #fff;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 12px;
        }
        .label {
          font-size: 13px;
          font-weight: 600;
          color: #16252e;
          margin-bottom: 6px;
        }
        .input {
          width: 100%;
          background: #fbfaf6;
          border: 1px solid rgba(60, 60, 67, 0.18);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 14px;
          color: #16252e;
          font-family: inherit;
        }
        textarea.input {
          min-height: 100px;
          resize: vertical;
        }
        .input:focus {
          outline: 2px solid #2a8fa8;
          outline-offset: 1px;
        }
        .err {
          color: #ba1a1a;
          font-size: 13px;
        }
        .submit {
          align-self: flex-start;
          padding: 10px 20px;
          border-radius: 999px;
          background: #2a8fa8;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: opacity 120ms ease, transform 120ms ease;
        }
        .submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .submit:active:not(:disabled) {
          transform: scale(0.97);
        }
      `}</style>
    </form>
  );
}
