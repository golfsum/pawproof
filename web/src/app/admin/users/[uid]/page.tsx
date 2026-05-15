"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getIdToken } from "@/lib/auth-context";
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
    breed?: string;
    birthday?: string;
  }>;
  ticketCount: number;
  vaccineCount: number;
  documentCount: number;
  reminderCount: number;
  entryCount: number;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const uid = String(params?.uid ?? "");
  const [data, setData] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
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
            </div>
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

          <section className="mt-8">
            <h2 className="font-semibold mb-3">Pets ({data.pets.length})</h2>
            {data.pets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong bg-surface p-6 text-center text-sm text-muted">
                This user hasn&apos;t added any pets.
              </div>
            ) : (
              <ul className="rounded-2xl border border-border bg-surface divide-y divide-divider">
                {data.pets.map((pet) => (
                  <li key={pet.id} className="px-4 py-3">
                    <div className="font-semibold">{pet.name}</div>
                    <div className="text-xs text-muted capitalize">
                      {pet.species}
                      {pet.breed ? ` · ${pet.breed}` : ""}
                      {pet.birthday ? ` · born ${fmtDate(pet.birthday)}` : ""}
                    </div>
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
