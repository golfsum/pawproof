"use client";

import { useMemo } from "react";
import { useUserData } from "@/lib/use-user-data";
import { daysUntil, isOverdue } from "@/lib/dates";
import { fmtDate } from "@/lib/utils";

export default function RemindersPage() {
  const { pets, reminders, loading } = useUserData();

  const groups = useMemo(() => {
    const active = reminders.filter((r) => !r.isCompleted);
    const overdue = active.filter((r) => isOverdue(r.dueDate));
    const today = active.filter((r) => {
      if (isOverdue(r.dueDate)) return false;
      const d = daysUntil(r.dueDate);
      return d != null && d === 0;
    });
    const upcoming = active.filter((r) => {
      const d = daysUntil(r.dueDate);
      return d != null && d > 0;
    });
    return { overdue, today, upcoming };
  }, [reminders]);

  const petName = (id: string) => pets.find((p) => p.id === id)?.name ?? "—";

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Reminders</h1>
      <p className="mt-1 text-muted text-sm">
        Care tasks across all your pets. Mark complete in the mobile app —
        the change syncs here instantly.
      </p>

      {loading ? (
        <div className="mt-8 rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          Loading…
        </div>
      ) : reminders.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border-strong bg-surface p-10 text-center">
          <h2 className="font-semibold">No reminders yet</h2>
          <p className="mt-2 text-sm text-muted">
            Create them from the PawProof mobile app.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <Group
            title="Overdue"
            tone="danger"
            items={groups.overdue}
            petName={petName}
          />
          <Group
            title="Due today"
            tone="warning"
            items={groups.today}
            petName={petName}
          />
          <Group
            title="Upcoming"
            tone="muted"
            items={groups.upcoming}
            petName={petName}
          />
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  tone,
  items,
  petName,
}: {
  title: string;
  tone: "danger" | "warning" | "muted";
  items: ReturnType<typeof Object>[] | any[];
  petName: (id: string) => string;
}) {
  if (items.length === 0) return null;
  const toneStyles = {
    danger: "border-danger/40 bg-danger-soft/30",
    warning: "border-warning/40 bg-warning-soft/30",
    muted: "border-border bg-surface",
  }[tone];
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-faint">
        {title} · {items.length}
      </h2>
      <ul className={`rounded-2xl border ${toneStyles} divide-y divide-divider`}>
        {items.map((r: any) => {
          const days = daysUntil(r.dueDate);
          return (
            <li key={r.id} className="px-4 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{r.title}</div>
                <div className="text-xs text-muted truncate">
                  {petName(r.petId)} · {r.type.replace("_", " ")}
                  {r.notes ? ` · ${r.notes}` : ""}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold">{fmtDate(r.dueDate)}</div>
                <div className="text-xs text-muted">
                  {days == null
                    ? ""
                    : days < 0
                      ? `${Math.abs(days)}d overdue`
                      : days === 0
                        ? "today"
                        : `in ${days}d`}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
