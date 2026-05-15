"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-muted text-sm">
        Account-level settings. Most preferences (notifications, units,
        emergency contacts per pet) live in the mobile app.
      </p>

      <section className="mt-8 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Account</h2>
        <dl className="mt-3 text-sm grid gap-2">
          <Row label="Email" value={user?.email ?? "—"} />
          <Row label="Display name" value={user?.displayName ?? "—"} />
          <Row label="Provider" value={user?.providerData?.[0]?.providerId ?? "—"} />
          <Row label="User ID" value={user?.uid ?? "—"} mono />
        </dl>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Subscription</h2>
        <p className="mt-2 text-sm text-muted">
          Subscriptions are managed in the iOS App Store (Settings → Apple
          ID → Subscriptions → PawProof). Refunds are handled by Apple per
          their policies.
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Data &amp; privacy</h2>
        <p className="mt-2 text-sm text-muted">
          To delete your account and all associated pet records, email{" "}
          <a className="text-primary font-semibold" href="mailto:support@pawproof.app">
            support@pawproof.app
          </a>{" "}
          or use Settings → Delete account in the iOS app. Deletion
          completes within 30 days.
        </p>
        <a
          href="/privacy"
          className="mt-3 inline-block text-sm text-primary font-semibold hover:underline"
        >
          Read our privacy policy →
        </a>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Session</h2>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => {
            if (auth) void signOut(auth).then(() => router.replace("/"));
          }}
        >
          Sign out
        </Button>
      </section>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-4 py-1.5 border-b border-divider last:border-0">
      <dt className="w-32 text-muted shrink-0">{label}</dt>
      <dd className={mono ? "font-mono text-xs break-all" : "break-all"}>{value}</dd>
    </div>
  );
}
