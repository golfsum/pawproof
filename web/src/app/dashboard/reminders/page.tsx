"use client";

import { useMemo, useState } from "react";
import {
  AlarmClock,
  Bug,
  Cookie,
  Footprints,
  Heart,
  Pill,
  Scissors,
  Search,
  ShieldCheck,
  Stethoscope,
  X,
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
import type { Reminder, ReminderCategory } from "@/lib/types";

// Mirrors the iOS Reminders screen. Groups reminders by pet. Each pet
// shows four subgroups: Vaccines (expired/expiring, with vaccine
// vocabulary), Overdue tasks, Due today, Upcoming. Search + filter
// chips live above so the desktop user can scan a long list.

type CategoryFilter = "all" | ReminderCategory;

const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "feeding", label: "Feeding" },
  { key: "walk", label: "Walk" },
  { key: "medication", label: "Meds" },
  { key: "vaccination", label: "Vaccines" },
  { key: "vet_visit", label: "Vet" },
  { key: "grooming", label: "Grooming" },
];

// Normalize the legacy ReminderType → ReminderCategory used by the
// new mobile filters. Web reads what mobile writes, so 'walking' and
// 'custom' need to map to 'walk' and 'general' for matching.
function normalizeCategory(r: Pick<Reminder, "category" | "type">): ReminderCategory {
  const raw = (r.category as string) ?? r.type;
  switch (raw) {
    case "walking":
    case "walk":
      return "walk";
    case "custom":
    case "general":
      return "general";
    case "training":
    case "other":
      return "general";
    case "feeding":
    case "medication":
    case "vet_visit":
    case "vaccination":
    case "grooming":
    case "flea_tick":
    case "heartworm":
    case "nail_trim":
      return raw;
    default:
      return "general";
  }
}

function reminderName(r: Reminder): string {
  return (r.name ?? r.title ?? "").trim() || "Reminder";
}

export default function RemindersPage() {
  const { pets, reminders, loading } = useUserData();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [petFilter, setPetFilter] = useState<string | null>(null);

  const active = useMemo(() => reminders.filter((r) => !r.isCompleted), [reminders]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return active.filter((r) => {
      if (categoryFilter !== "all" && normalizeCategory(r) !== categoryFilter) {
        return false;
      }
      if (petFilter && r.petId !== petFilter) return false;
      if (query) {
        const haystacks: string[] = [reminderName(r), r.notes ?? ""];
        const pet = pets.find((p) => p.id === r.petId);
        if (pet?.name) haystacks.push(pet.name);
        if (!haystacks.some((h) => h.toLowerCase().includes(query))) return false;
      }
      return true;
    });
  }, [active, search, categoryFilter, petFilter, pets]);

  const groupedByPet = useMemo(() => {
    return pets
      .map((pet) => {
        const petReminders = filtered.filter((r) => r.petId === pet.id);
        // Vaccines get their own bucket because they don't read as
        // "overdue tasks" — they're records with expiration dates.
        const vaccines = petReminders.filter(
          (r) => normalizeCategory(r) === "vaccination",
        );
        const expiredVaccines = vaccines.filter((r) => isOverdue(r.dueDate));
        const expiringVaccines = vaccines.filter((r) => {
          if (isOverdue(r.dueDate)) return false;
          const d = daysUntil(r.dueDate);
          return d != null && d >= 0 && d <= 60;
        });

        const tasks = petReminders.filter(
          (r) => normalizeCategory(r) !== "vaccination",
        );
        const overdue = tasks.filter((r) => isOverdue(r.dueDate));
        const today = tasks.filter((r) => {
          if (isOverdue(r.dueDate)) return false;
          const d = daysUntil(r.dueDate);
          return d != null && d === 0;
        });
        const upcoming = tasks.filter((r) => {
          if (isOverdue(r.dueDate)) return false;
          const d = daysUntil(r.dueDate);
          return d != null && d > 0;
        });

        return {
          pet,
          expiredVaccines,
          expiringVaccines,
          overdue,
          today,
          upcoming,
          total: petReminders.length,
        };
      })
      .filter((g) => g.total > 0);
  }, [pets, filtered]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0) +
    (petFilter ? 1 : 0);

  return (
    <>
      <PageTitle
        title="Reminders"
        subtitle={`${pets.length} pet${pets.length === 1 ? "" : "s"} · ${active.length} active reminder${active.length === 1 ? "" : "s"}`}
      />

      <div className="search-wrap">
        <Search size={16} color="rgba(60, 60, 67, 0.45)" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reminders or pet…"
          className="search-input"
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="search-clear"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      <div className="filter-row">
        {CATEGORY_FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            selected={categoryFilter === f.key}
            onClick={() => setCategoryFilter(f.key)}
          />
        ))}
      </div>

      {pets.length > 1 ? (
        <div className="filter-row">
          <Chip
            label="All pets"
            selected={petFilter === null}
            onClick={() => setPetFilter(null)}
          />
          {pets.map((p) => (
            <Chip
              key={p.id}
              label={p.name}
              selected={petFilter === p.id}
              onClick={() => setPetFilter(p.id)}
            />
          ))}
        </div>
      ) : null}

      {activeFilterCount > 0 ? (
        <div className="summary-row">
          <span>
            {filtered.length} match{filtered.length === 1 ? "" : "es"}
          </span>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategoryFilter("all");
              setPetFilter(null);
            }}
            className="clear-btn"
          >
            Clear filters
          </button>
        </div>
      ) : null}

      {loading ? (
        <EmptyCard title="Loading…" body="Fetching your reminders." />
      ) : groupedByPet.length === 0 ? (
        <EmptyCard
          title={active.length === 0 ? "No reminders yet" : "No matches"}
          body={
            active.length === 0
              ? "Add reminders for meals, walks, meds, grooming, vaccines, and vet visits from the iOS app."
              : "Try clearing filters or searching for a different term."
          }
        />
      ) : (
        <div className="pet-sections">
          {groupedByPet.map((g) => {
            const overdueCount = g.overdue.length;
            const expiredCount = g.expiredVaccines.length;
            const todayCount = g.today.length;
            const summary = [
              `${g.total} reminder${g.total === 1 ? "" : "s"}`,
              overdueCount > 0 ? `${overdueCount} overdue` : "",
              expiredCount > 0
                ? `${expiredCount} expired vaccine${expiredCount === 1 ? "" : "s"}`
                : "",
              todayCount > 0 ? `${todayCount} today` : "",
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={g.pet.id} className="pet-section">
                <div className="pet-header">
                  <PetAvatar pet={g.pet} size={36} />
                  <div style={{ flex: 1 }}>
                    <div className="pet-name">{g.pet.name}</div>
                    <div className="pet-sub">{summary}</div>
                  </div>
                  {overdueCount + expiredCount > 0 ? (
                    <span className="overdue-badge">
                      {overdueCount + expiredCount}
                    </span>
                  ) : null}
                </div>

                {g.expiredVaccines.length > 0 ? (
                  <VaccineSubgroup
                    title="Expired vaccines"
                    items={g.expiredVaccines}
                    state="expired"
                  />
                ) : null}
                {g.expiringVaccines.length > 0 ? (
                  <VaccineSubgroup
                    title="Expiring soon"
                    items={g.expiringVaccines}
                    state="soon"
                  />
                ) : null}
                {g.overdue.length > 0 ? (
                  <TaskSubgroup title="Overdue" items={g.overdue} tone="danger" />
                ) : null}
                {g.today.length > 0 ? (
                  <TaskSubgroup title="Due today" items={g.today} tone="warning" />
                ) : null}
                {g.upcoming.length > 0 ? (
                  <TaskSubgroup title="Upcoming" items={g.upcoming} tone="neutral" />
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <p className="helper">
        Use the PawProof mobile app to log meals, walks, meds, and Smart Scan
        documents. Web is best for reviewing records, exporting PDFs, and
        managing your account.
      </p>

      <style jsx>{`
        .search-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #fff;
          border: 1px solid rgba(60, 60, 67, 0.14);
          border-radius: 999px;
          margin-bottom: 8px;
        }
        .search-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 14px;
          color: #16252e;
          padding: 0;
          font-family: inherit;
        }
        .search-clear {
          background: transparent;
          border: none;
          color: rgba(60, 60, 67, 0.45);
          cursor: pointer;
          padding: 2px;
          display: inline-flex;
        }
        .filter-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 8px;
        }
        .summary-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 6px 4px 12px;
          font-size: 12px;
          color: rgba(60, 60, 67, 0.6);
        }
        .clear-btn {
          background: transparent;
          border: none;
          color: #2a8fa8;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          padding: 0;
        }

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
        .helper {
          margin-top: 24px;
          padding: 14px 16px;
          background: rgba(42, 143, 168, 0.08);
          border-radius: 14px;
          color: rgba(60, 60, 67, 0.75);
          font-size: 12px;
          line-height: 1.5;
        }
      `}</style>
    </>
  );
}

// Vaccine subgroup uses Expired / Expiring soon vocabulary instead of
// the task "Overdue" wording. Subtitle reads "Expires Oct 10, 2025"
// (not "2d overdue") because for a vaccine the actual date matters
// more than the relative gap.
function VaccineSubgroup({
  title,
  items,
  state,
}: {
  title: string;
  items: Reminder[];
  state: "expired" | "soon";
}) {
  return (
    <div>
      <SectionLabel>
        {title} · {items.length}
      </SectionLabel>
      <Card noPadding>
        {items.map((r) => {
          const days = daysUntil(r.dueDate);
          const subtitle =
            state === "expired"
              ? `Expired ${fmtDate(r.dueDate)}`
              : `Expires ${fmtDate(r.dueDate)}${
                  days != null && days > 0 ? ` · ${days}d left` : ""
                }`;
          const chipLabel =
            state === "expired"
              ? "Expired"
              : days != null && days <= 30
                ? `${days}d left`
                : "Expiring soon";
          return (
            <ListRow
              key={r.id}
              icon={<ShieldCheck size={18} />}
              iconTint={state === "expired" ? "danger" : "warning"}
              title={reminderName(r)}
              subtitle={
                <>
                  {subtitle}
                  {r.notes ? ` · ${r.notes}` : ""}
                </>
              }
              trailing={
                <Chip
                  label={chipLabel}
                  tone={state === "expired" ? "danger" : "warning"}
                />
              }
            />
          );
        })}
      </Card>
    </div>
  );
}

function TaskSubgroup({
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
          const Icon = iconForReminderCategory(normalizeCategory(r));
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
              title={reminderName(r)}
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

function iconForReminderCategory(category: ReminderCategory) {
  switch (category) {
    case "feeding":
      return Cookie;
    case "walk":
      return Footprints;
    case "medication":
      return Pill;
    case "vaccination":
      return ShieldCheck;
    case "grooming":
    case "nail_trim":
      return Scissors;
    case "vet_visit":
      return Stethoscope;
    case "flea_tick":
      return Bug;
    case "heartworm":
      return Heart;
    default:
      return AlarmClock;
  }
}
