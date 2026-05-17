"use client";

import { useMemo } from "react";
import {
  AlarmClock,
  Cookie,
  Footprints,
  Pill,
  Scissors,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { useUserData } from "@/lib/use-user-data";
import { daysUntil, isOverdue } from "@/lib/dates";
import { fmtDate } from "@/lib/utils";
import {
  Card,
  Chip,
  EmptyCard,
  ListRow,
  PageTitle,
  PetAvatar,
  SectionLabel,
} from "@/components/app-ui";
import type { Reminder } from "@/lib/types";

// Mirrors the iOS Reminders screen. Groups reminders by pet, each
// pet shows three subgroups: Overdue / Due today / Upcoming. Pet
// header shows total + overdue count to match the mobile badge.

export default function RemindersPage() {
  const { pets, reminders, loading } = useUserData();
  const active = reminders.filter((r) => !r.isCompleted);

  const groupedByPet = useMemo(() => {
    return pets
      .map((pet) => {
        const petReminders = active.filter((r) => r.petId === pet.id);
        const overdue = petReminders.filter((r) => isOverdue(r.dueDate));
        const today = petReminders.filter((r) => {
          if (isOverdue(r.dueDate)) return false;
          const d = daysUntil(r.dueDate);
          return d != null && d === 0;
        });
        const upcoming = petReminders.filter((r) => {
          const d = daysUntil(r.dueDate);
          return d != null && d > 0;
        });
        return { pet, overdue, today, upcoming, total: petReminders.length };
      })
      .filter((g) => g.total > 0);
  }, [pets, active]);

  return (
    <>
      <PageTitle
        title="Reminders"
        subtitle={`${pets.length} pet${pets.length === 1 ? "" : "s"} · ${active.length} active reminder${active.length === 1 ? "" : "s"}`}
      />

      {loading ? (
        <EmptyCard title="Loading…" body="Fetching your reminders." />
      ) : active.length === 0 ? (
        <EmptyCard
          title="No reminders yet"
          body="Add reminders for meals, walks, meds, grooming, vaccines, and vet visits from the iOS app."
        />
      ) : (
        <div className="pet-sections">
          {groupedByPet.map((g) => (
            <div key={g.pet.id} className="pet-section">
              <div className="pet-header">
                <PetAvatar name={g.pet.name} size={36} />
                <div style={{ flex: 1 }}>
                  <div className="pet-name">{g.pet.name}</div>
                  <div className="pet-sub">
                    {g.total} reminder{g.total === 1 ? "" : "s"}
                    {g.overdue.length > 0 ? ` · ${g.overdue.length} overdue` : ""}
                    {g.today.length > 0 ? ` · ${g.today.length} today` : ""}
                  </div>
                </div>
                {g.overdue.length > 0 ? (
                  <span className="overdue-badge">{g.overdue.length}</span>
                ) : null}
              </div>

              {g.overdue.length > 0 ? (
                <Subgroup title="Overdue" items={g.overdue} tone="danger" />
              ) : null}
              {g.today.length > 0 ? (
                <Subgroup title="Due today" items={g.today} tone="warning" />
              ) : null}
              {g.upcoming.length > 0 ? (
                <Subgroup title="Upcoming" items={g.upcoming} tone="neutral" />
              ) : null}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .pet-sections {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .pet-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .pet-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 4px;
        }
        .pet-name {
          font-size: 17px;
          font-weight: 700;
          color: #16252e;
          letter-spacing: -0.2px;
        }
        .pet-sub {
          font-size: 12px;
          color: rgba(60, 60, 67, 0.6);
          margin-top: 2px;
        }
        .overdue-badge {
          background: #ba1a1a;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          min-width: 24px;
          height: 24px;
          padding: 0 8px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </>
  );
}

function Subgroup({
  title,
  items,
  tone,
}: {
  title: string;
  items: Reminder[];
  tone: "danger" | "warning" | "neutral";
}) {
  return (
    <div>
      <SectionLabel>
        {title} · {items.length}
      </SectionLabel>
      <Card noPadding>
        {items.map((r) => {
          const Icon = iconForReminderType(r.type);
          const days = daysUntil(r.dueDate);
          const whenLabel =
            days == null
              ? ""
              : days < 0
                ? `${Math.abs(days)}d overdue`
                : days === 0
                  ? "Today"
                  : `In ${days}d`;
          return (
            <ListRow
              key={r.id}
              icon={<Icon size={18} />}
              iconTint={tone === "danger" ? "danger" : tone === "warning" ? "warning" : "primary"}
              title={r.title}
              subtitle={
                <>
                  {fmtDate(r.dueDate)} · {whenLabel}
                  {r.notes ? ` · ${r.notes}` : ""}
                </>
              }
              trailing={
                tone === "danger" ? (
                  <Chip label="Overdue" tone="danger" />
                ) : tone === "warning" ? (
                  <Chip label="Today" tone="warning" />
                ) : (
                  <Chip label={whenLabel || "Soon"} tone="neutral" />
                )
              }
            />
          );
        })}
      </Card>
    </div>
  );
}

function iconForReminderType(type: string) {
  switch (type) {
    case "feeding":
      return Cookie;
    case "walking":
      return Footprints;
    case "medication":
      return Pill;
    case "vaccination":
      return ShieldCheck;
    case "grooming":
      return Scissors;
    case "vet_visit":
      return Stethoscope;
    default:
      return AlarmClock;
  }
}
