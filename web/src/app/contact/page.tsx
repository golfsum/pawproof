"use client";

import { useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not send message.");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="text-4xl font-bold tracking-tight">Get in touch</h1>
          <p className="mt-3 text-muted max-w-xl">
            Questions, feedback, bugs, billing: we read every message.
            Direct route is{" "}
            <a className="text-primary font-semibold" href="mailto:support@pawproof.app">
              support@pawproof.app
            </a>
            . Or use the form below.
          </p>

          {sent ? (
            <div className="mt-8 rounded-2xl border border-primary bg-primary-soft p-6">
              <h2 className="font-semibold text-lg">Thanks, we got it.</h2>
              <p className="mt-1 text-sm text-muted">
                We&apos;ll reply to{" "}
                <span className="font-semibold">{email}</span> within a
                business day or two.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-8 grid gap-4 rounded-2xl border border-border bg-surface p-6"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Your name" htmlFor="name">
                  <input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Email" htmlFor="email">
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                  />
                </Field>
              </div>
              <Field label="Subject" htmlFor="subject">
                <input
                  id="subject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Message" htmlFor="message">
                <textarea
                  id="message"
                  required
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="input min-h-[140px]"
                />
              </Field>
              {error ? (
                <p className="text-sm text-danger">{error}</p>
              ) : null}
              <div className="flex justify-end">
                <Button type="submit" disabled={busy}>
                  {busy ? "Sending…" : "Send message"}
                </Button>
              </div>
            </form>
          )}

          <p className="mt-12 text-sm text-muted">
            Already a user with a question about your account or a specific
            pet record? Sign in and use the{" "}
            <a className="text-primary font-semibold" href="/dashboard/support">
              Support
            </a>{" "}
            page in your dashboard. Your ticket will include the right
            context so we can help faster.
          </p>
        </div>
      </main>
      <SiteFooter />

      <style jsx global>{`
        .input {
          width: 100%;
          background: var(--surface-elevated);
          border: 1px solid var(--border-strong);
          border-radius: 0.625rem;
          padding: 0.625rem 0.875rem;
          font-size: 0.9rem;
          color: var(--foreground);
        }
        .input:focus {
          outline: 2px solid var(--primary);
          outline-offset: 1px;
        }
      `}</style>
    </>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="grid gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
