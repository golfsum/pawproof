"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { Button } from "@/components/ui/button";

function UnsubscribeInner() {
  const params = useSearchParams();
  const initialEmail = params.get("email") ?? "";
  const token = params.get("token") ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If they arrived with both email + token (the path emails include),
  // attempt the unsubscribe automatically — one click, no fuss.
  useEffect(() => {
    if (initialEmail && token) {
      void submit(initialEmail, token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(emailValue: string, tokenValue: string | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailValue, token: tokenValue ?? null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not unsubscribe.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unsubscribe.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Unsubscribe</h1>
      <p className="mt-2 text-muted">
        Confirm the email address you want to unsubscribe from PawProof
        marketing and reminder emails. Service-critical messages (account
        security, billing receipts) will still be sent.
      </p>

      {done ? (
        <div className="mt-8 rounded-2xl border border-primary bg-primary-soft p-6">
          <h2 className="font-semibold text-lg">You&apos;re unsubscribed.</h2>
          <p className="mt-1 text-sm text-muted">
            <span className="font-semibold">{email}</span> won&apos;t receive
            marketing or reminder emails from us. Changed your mind? Sign
            in to your dashboard and re-enable notifications under
            Settings.
          </p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            void submit(email.trim(), token || null);
          }}
          className="mt-8 grid gap-4 rounded-2xl border border-border bg-surface p-6"
        >
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Email address</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm focus:outline-2 focus:outline-primary"
            />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Unsubscribing…" : "Unsubscribe"}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-16">Loading…</div>}>
          <UnsubscribeInner />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
