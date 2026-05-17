"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlarmClock,
  Bone,
  Calendar,
  ChevronRight,
  Cookie,
  Download,
  FileText,
  Footprints,
  Heart,
  HeartPulse,
  Pill,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Utensils,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useUserData } from "@/lib/use-user-data";
import { daysUntil, isOverdue } from "@/lib/dates";
import { relativeTime } from "@/lib/utils";
import {
  Card,
  Chip,
  EmptyCard,
  ListRow,
  PageTitle,
  PetAvatar,
  SectionLabel,
  StatusCard,
} from "@/components/app-ui";
import { getEntryPetIds, type JournalEntry, type Reminder, type VaccineRecord } from "@/lib/types";

// /dashboard Home — mirrors the iOS Home tab but tuned for the larger
// surface. Desktop renders a 2-column grid (main feed on the left,
// glanceable Today's Care + Pets summaries on the right). Mobile
// stacks everything in one column.
//
// Section order (mobile):
//   1. Greeting + date + CTAs
//   2. Status row (Due / Overdue / Expiring)
//   3. Today's Care daily-stats grid
//   4. Today (chronological feed)
//   5. Needs Attention (grouped per-pet card)
//   6. Your Pets (status preview cards)
//   7. Records summary
//   8. Recent activity

// ── Reminder vocabulary mirror of `src/utils/reminderCategory.ts` on
// the mobile side. Web doesn't import the mobile module directly
// because the path alias differs; the surface area we use here is
// small enough to inline cleanly.

type ReminderCategoryKey =
  | "feeding"
  | "walk"
  | "medication"
  | "vet_visit"
  | "vaccination"
  | "grooming"
  | "flea_tick"
  | "heartworm"
  | "nail_trim"
  | "general";

const CATEGORY_FROM_TYPE: Record<string, ReminderCategoryKey> = {
  feeding: "feeding",
  walking: "walk",
  walk: "walk",
  medication: "medication",
  vet_visit: "vet_visit",
  vaccination: "vaccination",
  grooming: "grooming",
  flea_tick: "flea_tick",
  heartworm: "heartworm",
  nail_trim: "nail_trim",
  custom: "general",
  general: "general",
};

const CATEGORY_DEFAULT_NAME: Record<ReminderCategoryKey, string> = {
  feeding: "Feeding reminder",
  walk: "Walk reminder",
  medication: "Medication reminder",
  vet_visit: "Vet visit",
  vaccination: "Vaccine reminder",
  grooming: "Grooming reminder",
  flea_tick: "Flea / tick reminder",
  heartworm: "Heartworm reminder",
  nail_trim: "Nail trim",
  general: "Reminder",
};

function getCategory(r: Pick<Reminder, "type">): ReminderCategoryKey {
  return CATEGORY_FROM_TYPE[r.type] ?? "general";
}

function getReminderName(
  r: Pick<Reminder, "title" | "type"> & { name?: string },
): string {
  const fromUser = ((r.name ?? r.title) ?? "").trim();
  if (fromUser) return fromUser;
  return CATEGORY_DEFAULT_NAME[getCategory(r)];
}

// ── Activity copy ───────────────────────────────────────────────────
// Web reads natural sentences ("Walk saved", "Breakfast logged",
// "Walky completed") rather than the raw entry title. For reminder
// completions the entry carries subtype: 'reminder', which we use to
// pick the "completed" wording.

const ACTIVITY_VERB_BY_TYPE: Record<string, string> = {
  fed: "Fed",
  walk: "Walk saved",
  medication: "Medication logged",
  training: "Training logged",
  grooming: "Grooming logged",
  vet_visit: "Vet visit logged",
  symptom: "Health note added",
  bathroom: "Bathroom break",
  accident: "Accident logged",
  note: "Note added",
  photo: "Photo added",
};

function activityHeadline(e: JournalEntry): string {
  if (e.subtype === "reminder") return `${e.title} completed`;
  if (e.type === "fed" && e.amount) return `${e.amount} logged`;
  if (e.type === "walk") return e.title || "Walk saved";
  return e.title || ACTIVITY_VERB_BY_TYPE[e.type] || "Activity";
}

function iconForJournalType(type: string) {
  switch (type) {
    case "fed":
      return Utensils;
    case "walk":
      return Footprints;
    case "medication":
      return Pill;
    case "grooming":
      return Sparkles;
    case "vet_visit":
      return Stethoscope;
    case "symptom":
      return HeartPulse;
    default:
      return Bone;
  }
}

function iconForReminderType(type: string): typeof AlarmClock {
  switch (type) {
    case "feeding":
      return Cookie;
    case "walking":
    case "walk":
      return Footprints;
    case "medication":
      return Pill;
    case "vaccination":
      return ShieldCheck;
    case "grooming":
      return Sparkles;
    case "vet_visit":
      return Stethoscope;
    default:
      return AlarmClock;
  }
}

export default function DashboardOverview() {
  const { user } = useAuth();
  const { pets, reminders, vaccines, entries } = useUserData();

  const overdue = useMemo(
    () => reminders.filter((r) => !r.isCompleted && isOverdue(r.dueDate)),
    [reminders],
  );
  const dueToday = useMemo(
    () =>
      reminders.filter((r) => {
        if (r.isCompleted) return false;
        if (isOverdue(r.dueDate)) return false;
        const d = daysUntil(r.dueDate);
        return d != null && d === 0;
      }),
    [reminders],
  );
  const expiringSoon = useMemo(
    () =>
      vaccines.filter((v) => {
        if (!v.expirationDate) return false;
        const d = daysUntil(v.expirationDate);
        return d != null && d <= 30 && d >= 0;
      }),
    [vaccines],
  );
  const expiredVaccines = useMemo(
    () =>
      vaccines.filter(
        (v) => v.expirationDate && (daysUntil(v.expirationDate) ?? 999) < 0,
      ),
    [vaccines],
  );

  // Today's Care — daily stats rolled up across every pet. Same logic
  // as the mobile Home (entries today by type, meds-missed from
  // medication reminders due today minus medication entries today).
  const todaysCare = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startMs = startOfDay.getTime();
    const endMs = startMs + 24 * 60 * 60 * 1000;

    const todays = entries.filter((e) => +new Date(e.timestamp) >= startMs);
    const meals = todays.filter((e) => e.type === "fed");
    const walks = todays.filter((e) => e.type === "walk");
    const meds = todays.filter((e) => e.type === "medication");
    const health = todays.filter((e) => e.type === "symptom");

    const mealsDueToday = reminders.filter((r) => {
      if (r.type !== "feeding") return false;
      if (r.isCompleted) return false;
      const due = +new Date(r.dueDate);
      return due >= startMs && due < endMs;
    });

    const medsDueToday = reminders.filter((r) => {
      if (r.type !== "medication") return false;
      if (r.isCompleted) return false;
      const due = +new Date(r.dueDate);
      return due >= startMs && due < endMs;
    });

    // Walk distance is captured on the entry as `distanceMeters` (set
    // by the mobile app); web doesn't add walks itself so the field
    // either exists from a mobile log or it doesn't.
    const walkDistanceMeters = walks.reduce(
      (acc, w) => acc + ((w as { distanceMeters?: number | null }).distanceMeters ?? 0),
      0,
    );

    return {
      anyLoggedToday: todays.length > 0,
      mealsLogged: meals.length,
      mealsTarget: mealsDueToday.length,
      walksCount: walks.length,
      walkDistanceMeters: walkDistanceMeters > 0 ? walkDistanceMeters : null,
      medsLogged: meds.length,
      medsMissed: Math.max(0, medsDueToday.length - meds.length),
      healthCount: health.length,
    };
  }, [entries, reminders]);

  // Needs Attention: group ALL of a pet's expired vaccines + overdue
  // task reminders into a single per-pet card. Solves the "five
  // identical Bordetella rows on the dashboard" problem the spec
  // calls out specifically.
  type NeedsBlock = {
    pet: {
      id: string;
      name: string;
      species?: string;
      breed?: string;
      photoUrl?: string | null;
    };
    overdueTasks: Reminder[];
    expiredVaccines: VaccineRecord[];
    totalIssues: number;
  };
  const needsAttention = useMemo<NeedsBlock[]>(() => {
    return pets
      .map((pet) => {
        const petOverdueTasks = reminders.filter(
          (r) =>
            r.petId === pet.id &&
            !r.isCompleted &&
            isOverdue(r.dueDate) &&
            r.type !== "vaccination",
        );
        const petExpired = vaccines.filter(
          (v) =>
            v.petId === pet.id &&
            v.expirationDate &&
            (daysUntil(v.expirationDate) ?? 999) < 0,
        );
        return {
          pet,
          overdueTasks: petOverdueTasks,
          expiredVaccines: petExpired,
          totalIssues: petOverdueTasks.length + petExpired.length,
        };
      })
      .filter((b) => b.totalIssues > 0)
      .sort((a, b) => b.totalIssues - a.totalIssues);
  }, [pets, reminders, vaccines]);

  // Today list — chronological feed of overdue/today reminders, plus
  // vaccines that just lapsed (within 7 days). We dedupe the latter
  // because Needs Attention already aggregates them per pet.
  type TodayItem = {
    id: string;
    title: string;
    sub: string;
    tone: "danger" | "warning";
    icon: typeof AlarmClock;
    sortKey: number;
    href: string;
  };
  const todayItems = useMemo<TodayItem[]>(() => {
    const items: TodayItem[] = [];
    const startOfToday = (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })();
    for (const r of reminders) {
      if (r.isCompleted) continue;
      const due = new Date(r.dueDate);
      const pet = pets.find((p) => p.id === r.petId);
      const name = getReminderName(r);
      if (isOverdue(r.dueDate)) {
        items.push({
          id: `r-${r.id}`,
          title: name,
          sub: `${pet?.name ?? "—"} · Overdue · ${due.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}`,
          tone: "danger",
          icon: iconForReminderType(r.type),
          sortKey: due.getTime(),
          href: "/dashboard/reminders",
        });
      } else if ((daysUntil(r.dueDate) ?? 999) === 0) {
        items.push({
          id: `r-${r.id}`,
          title: name,
          sub: `${pet?.name ?? "—"} · Due today · ${due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`,
          tone: "warning",
          icon: iconForReminderType(r.type),
          sortKey: due.getTime(),
          href: "/dashboard/reminders",
        });
      }
    }
    return items.sort((a, b) => {
      const aPast = a.sortKey < startOfToday;
      const bPast = b.sortKey < startOfToday;
      if (aPast !== bPast) return aPast ? -1 : 1;
      return a.sortKey - b.sortKey;
    });
  }, [reminders, pets]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Good evening";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = user?.displayName?.split(" ")[0];
  const recentEntries = entries.slice(0, 6);

  // Walk distance display defers to whatever the entry stored. The
  // web side doesn't have a unit pref yet — fall back to miles, which
  // matches the mobile default.
  const formatDistance = (meters: number): string => {
    const miles = meters / 1609.344;
    return `${miles.toFixed(miles < 10 ? 1 : 0).replace(/\.0$/, "")} mi`;
  };

  return (
    <>
      <PageTitle
        eyebrow={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}
        title={firstName ? `${greeting}, ${firstName}` : greeting}
        subtitle={
          pets.length === 0
            ? "Add your first pet in the PawProof app to start tracking care."
            : `Managing ${pets.length} pet${pets.length === 1 ? "" : "s"}.`
        }
      />

      {/* Header CTAs — desktop-leaning row of primary actions. On
          mobile they wrap to two rows so they don't crowd the title. */}
      <div className="cta-row">
        <Link href="/dashboard/pets" className="cta cta-primary">
          <ShieldAlert size={16} />
          <span>Emergency card</span>
        </Link>
        <Link href="/dashboard/records" className="cta cta-secondary">
          <Download size={16} />
          <span>Export records</span>
        </Link>
        <Link href="/dashboard/reminders" className="cta cta-secondary">
          <Plus size={16} />
          <span>Add reminder</span>
        </Link>
      </div>

      <div className="status-row">
        <StatusCard
          label="Due today"
          count={dueToday.length}
          tone="accent"
          href="/dashboard/reminders"
        />
        <StatusCard
          label="Overdue"
          count={overdue.length}
          tone="danger"
          href="/dashboard/reminders"
        />
        <StatusCard
          label="Expiring"
          count={expiringSoon.length}
          tone="warning"
          href="/dashboard/records"
        />
      </div>

      {/* Two-column desktop layout below this point. Mobile stacks. */}
      <div className="grid-2col">
        <div className="col-main">
          {pets.length > 0 ? (
            <>
              <SectionLabel>Today&apos;s care</SectionLabel>
              <div className="care-grid">
                <CareTile
                  icon={<Utensils size={16} />}
                  tint="#b58400"
                  label="Meals"
                  value={
                    todaysCare.mealsTarget > 0
                      ? `${todaysCare.mealsLogged} of ${todaysCare.mealsTarget} logged`
                      : todaysCare.mealsLogged > 0
                        ? `${todaysCare.mealsLogged} logged`
                        : "None yet"
                  }
                />
                <CareTile
                  icon={<Footprints size={16} />}
                  tint="#2a8fa8"
                  label="Walks"
                  value={
                    todaysCare.walkDistanceMeters
                      ? `${formatDistance(todaysCare.walkDistanceMeters)} today`
                      : todaysCare.walksCount > 0
                        ? `${todaysCare.walksCount} walk${todaysCare.walksCount === 1 ? "" : "s"}`
                        : "No walks yet"
                  }
                />
                <CareTile
                  icon={<Pill size={16} />}
                  tint="#ba1a1a"
                  label="Meds"
                  value={
                    todaysCare.medsMissed > 0
                      ? `${todaysCare.medsMissed} missed`
                      : todaysCare.medsLogged > 0
                        ? "All caught up"
                        : "None today"
                  }
                />
                <CareTile
                  icon={<Heart size={16} />}
                  tint="#7a5cd6"
                  label="Health"
                  value={
                    todaysCare.healthCount > 0
                      ? `${todaysCare.healthCount} note${todaysCare.healthCount === 1 ? "" : "s"}`
                      : "No notes today"
                  }
                />
              </div>
              {!todaysCare.anyLoggedToday ? (
                <p className="care-empty">
                  No care logged yet today. Use Quick Log in the PawProof app to
                  capture meals, walks, meds, and health notes.
                </p>
              ) : null}
            </>
          ) : null}

          {todayItems.length > 0 ? (
            <>
              <SectionLabel>Today</SectionLabel>
              <Card noPadding>
                {todayItems.slice(0, 6).map((item) => {
                  const Icon = item.icon;
                  return (
                    <ListRow
                      key={item.id}
                      href={item.href}
                      icon={<Icon size={18} />}
                      iconTint={item.tone}
                      title={item.title}
                      subtitle={item.sub}
                    />
                  );
                })}
                {todayItems.length > 6 ? (
                  <Link href="/dashboard/reminders" className="today-more">
                    + {todayItems.length - 6} more for today
                  </Link>
                ) : null}
              </Card>
            </>
          ) : null}

          {needsAttention.length > 0 ? (
            <>
              <SectionLabel
                action={{ label: "View reminders", href: "/dashboard/reminders" }}
              >
                Needs attention
              </SectionLabel>
              <div className="needs-list">
                {needsAttention.map((block) => (
                  <NeedsAttentionCard
                    key={block.pet.id}
                    pet={block.pet}
                    overdueTasks={block.overdueTasks}
                    expiredVaccines={block.expiredVaccines}
                  />
                ))}
              </div>
            </>
          ) : pets.length > 0 ? (
            <>
              <SectionLabel>Needs attention</SectionLabel>
              <EmptyCard
                title="All caught up today"
                body="No care items need attention right now. Nice work."
              />
            </>
          ) : null}

          <SectionLabel action={{ label: "View all", href: "/dashboard/pets" }}>
            Your pets
          </SectionLabel>
          {pets.length === 0 ? (
            <EmptyCard
              title="No pets yet"
              body="Add your first pet in the PawProof iOS app to start tracking care."
            />
          ) : (
            <div className="pet-list">
              {pets.slice(0, 4).map((p) => {
                const petPreview = buildPetPreview(p.id, reminders, vaccines);
                return (
                  <Link
                    key={p.id}
                    href={`/dashboard/pets`}
                    className="pet-link"
                  >
                    <div className="pet-card">
                      <div className="pet-card-header">
                        <PetAvatar pet={p} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="pet-name">{p.name}</div>
                          <div className="pet-sub">
                            <span style={{ textTransform: "capitalize" }}>
                              {p.species}
                            </span>
                            {p.breed ? ` · ${p.breed}` : ""}
                          </div>
                        </div>
                        <ChevronRight size={16} color="rgba(60, 60, 67, 0.3)" />
                      </div>
                      <div className="pet-preview">
                        <Chip
                          label={petPreview.chipLabel}
                          tone={petPreview.tone}
                        />
                        <span className="pet-preview-text">{petPreview.text}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <SectionLabel>Recent activity</SectionLabel>
          {recentEntries.length === 0 ? (
            <EmptyCard
              title="No activity yet"
              body="Use Quick Log in the PawProof iOS app to capture meals, walks, meds, and health notes here."
            />
          ) : (
            <Card noPadding>
              {recentEntries.map((e) => {
                // Multi-pet entries cover several pets; join their
                // names so the row reads "Yahzi, Moqui, and Lovie"
                // instead of just the primary pet.
                const entryPets = getEntryPetIds(e)
                  .map((id) => pets.find((p) => p.id === id))
                  .filter((p): p is NonNullable<typeof p> => !!p);
                const sub = entryPets.length === 0
                  ? "—"
                  : entryPets.length === 1
                    ? entryPets[0].name
                    : entryPets.length === 2
                      ? `${entryPets[0].name} and ${entryPets[1].name}`
                      : `${entryPets.slice(0, -1).map((p) => p.name).join(", ")}, and ${entryPets[entryPets.length - 1].name}`;
                const Icon = iconForJournalType(e.type);
                return (
                  <ListRow
                    key={e.id}
                    icon={<Icon size={16} />}
                    iconTint={iconTintForType(e.type)}
                    title={activityHeadline(e)}
                    subtitle={sub}
                    trailing={
                      <span style={{ fontSize: 12, color: "rgba(60, 60, 67, 0.55)" }}>
                        {relativeTime(e.timestamp)}
                      </span>
                    }
                  />
                );
              })}
            </Card>
          )}
        </div>

        <div className="col-side">
          <SectionLabel action={{ label: "Open records", href: "/dashboard/records" }}>
            Records
          </SectionLabel>
          <Link href="/dashboard/records" className="records-link">
            <div className="records-card">
              <RecordsStat
                icon={<ShieldCheck size={18} />}
                count={vaccines.length}
                label={vaccines.length === 1 ? "vaccine" : "vaccines"}
                tint="#2a8fa8"
              />
              <div className="records-divider" />
              <RecordsStat
                icon={<FileText size={18} />}
                count={expiredVaccines.length}
                label="expired"
                tint="#ba1a1a"
              />
              <ChevronRight size={18} color="rgba(60, 60, 67, 0.3)" />
            </div>
          </Link>

          <SectionLabel>Quick actions</SectionLabel>
          <div className="quick-grid">
            <QuickTile
              href="/dashboard/pets"
              icon={<Sparkles size={20} />}
              label="Pets"
              tint="#2a8fa8"
            />
            <QuickTile
              href="/dashboard/reminders"
              icon={<AlarmClock size={20} />}
              label="Reminders"
              tint="#b58400"
            />
            <QuickTile
              href="/dashboard/records"
              icon={<ShieldCheck size={20} />}
              label="Records"
              tint="#1e6c80"
            />
            <QuickTile
              href="/dashboard/support"
              icon={<Calendar size={20} />}
              label="Support"
              tint="#7a5cd6"
            />
          </div>

          <div className="helper-card">
            <Sparkles size={16} color="#2a8fa8" />
            <p>
              PawProof on the web is best for reviewing records, exporting PDFs,
              and managing account details. Use the mobile app for daily care
              logging and Smart Scan.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .cta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: -4px 0 16px;
        }
        .cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: transform 120ms ease, box-shadow 120ms ease,
            background 120ms ease;
        }
        .cta-primary {
          background: #2a8fa8;
          color: #fff;
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.02),
            0 6px 18px rgba(42, 143, 168, 0.25);
        }
        .cta-primary:hover {
          background: #1e6c80;
        }
        .cta-secondary {
          background: #fff;
          color: #16252e;
          border: 1px solid rgba(60, 60, 67, 0.14);
        }
        .cta-secondary:hover {
          background: #f7f1e3;
        }

        .status-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .grid-2col {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .col-main,
        .col-side {
          display: flex;
          flex-direction: column;
        }
        @media (min-width: 1024px) {
          .grid-2col {
            display: grid;
            grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
            gap: 28px;
            align-items: start;
          }
        }

        .care-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .care-empty {
          margin: 8px 4px 0;
          font-size: 13px;
          color: rgba(60, 60, 67, 0.65);
          line-height: 1.5;
        }
        .needs-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .today-more {
          display: block;
          text-align: center;
          padding: 12px;
          color: #2a8fa8;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          border-top: 0.5px solid rgba(60, 60, 67, 0.18);
        }

        .pet-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        @media (min-width: 720px) {
          .pet-list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .pet-link {
          color: inherit;
          text-decoration: none;
        }
        .pet-card {
          background: #fff;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: transform 120ms ease, box-shadow 120ms ease;
        }
        .pet-link:hover .pet-card {
          box-shadow: 0 8px 22px rgba(0, 0, 0, 0.05);
        }
        .pet-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pet-name {
          font-size: 18px;
          font-weight: 700;
          color: #16252e;
          letter-spacing: -0.2px;
        }
        .pet-sub {
          font-size: 13px;
          color: rgba(60, 60, 67, 0.6);
          margin-top: 2px;
        }
        .pet-preview {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-top: 12px;
          border-top: 0.5px solid rgba(60, 60, 67, 0.18);
        }
        .pet-preview-text {
          font-size: 13px;
          color: #16252e;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .records-link {
          text-decoration: none;
          color: inherit;
        }
        .records-card {
          background: #fff;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .records-divider {
          width: 1px;
          align-self: stretch;
          background: rgba(60, 60, 67, 0.18);
        }
        .quick-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .helper-card {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 14px 16px;
          background: rgba(42, 143, 168, 0.08);
          border-radius: 14px;
          margin-top: 12px;
        }
        .helper-card p {
          margin: 0;
          font-size: 12px;
          line-height: 1.5;
          color: rgba(60, 60, 67, 0.75);
        }
      `}</style>
    </>
  );
}

// ── Helpers / small components ─────────────────────────────────────

function buildPetPreview(
  petId: string,
  reminders: Reminder[],
  vaccines: VaccineRecord[],
): { chipLabel: string; tone: "danger" | "warning" | "success"; text: string } {
  const overdueTasks = reminders.filter(
    (r) =>
      r.petId === petId &&
      !r.isCompleted &&
      isOverdue(r.dueDate) &&
      r.type !== "vaccination",
  );
  if (overdueTasks.length > 0) {
    const r = overdueTasks[0];
    return {
      chipLabel: "Overdue",
      tone: "danger",
      text: `${getReminderName(r)} · ${relativeTime(r.dueDate)}`,
    };
  }
  const expired = vaccines
    .filter(
      (v) =>
        v.petId === petId &&
        v.expirationDate &&
        (daysUntil(v.expirationDate) ?? 999) < 0,
    )
    .sort(
      (a, b) =>
        +new Date(b.expirationDate as string) -
        +new Date(a.expirationDate as string),
    );
  if (expired.length > 0) {
    const v = expired[0];
    return {
      chipLabel: "Expired",
      tone: "danger",
      text: `${v.vaccineName} vaccine · ${new Date(v.expirationDate as string).toLocaleDateString()}`,
    };
  }
  const dueTodayTasks = reminders.filter((r) => {
    if (r.petId !== petId || r.isCompleted) return false;
    if (isOverdue(r.dueDate)) return false;
    const d = daysUntil(r.dueDate);
    return d != null && d === 0;
  });
  if (dueTodayTasks.length > 0) {
    return {
      chipLabel: "Due today",
      tone: "warning",
      text: `${getReminderName(dueTodayTasks[0])}`,
    };
  }
  return { chipLabel: "All caught up", tone: "success", text: "Nothing pending" };
}

function iconTintForType(type: string): "primary" | "warning" | "danger" | "muted" {
  switch (type) {
    case "walk":
    case "fed":
      return "primary";
    case "medication":
      return "danger";
    case "symptom":
      return "warning";
    case "grooming":
    case "vet_visit":
      return "primary";
    default:
      return "muted";
  }
}

function CareTile({
  icon,
  tint,
  label,
  value,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  value: string;
}) {
  return (
    <div className="care-tile">
      <div className="care-icon" style={{ background: `${tint}22`, color: tint }}>
        {icon}
      </div>
      <div className="care-text">
        <span className="care-label">{label}</span>
        <span className="care-value">{value}</span>
      </div>
      <style jsx>{`
        .care-tile {
          background: #fff;
          border-radius: 14px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.02);
        }
        .care-icon {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .care-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .care-label {
          font-size: 11px;
          font-weight: 600;
          color: rgba(60, 60, 67, 0.6);
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }
        .care-value {
          font-size: 14px;
          font-weight: 700;
          color: #16252e;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </div>
  );
}

function NeedsAttentionCard({
  pet,
  overdueTasks,
  expiredVaccines,
}: {
  pet: { id: string; name: string; species?: string; photoUrl?: string | null };
  overdueTasks: Reminder[];
  expiredVaccines: VaccineRecord[];
}) {
  const [expanded, setExpanded] = useState(false);
  const total = overdueTasks.length + expiredVaccines.length;

  const summary = (() => {
    const bits: string[] = [];
    if (overdueTasks.length > 0) {
      bits.push(
        `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? "" : "s"}`,
      );
    }
    if (expiredVaccines.length > 0) {
      bits.push(
        `${expiredVaccines.length} expired vaccine${expiredVaccines.length === 1 ? "" : "s"}`,
      );
    }
    return bits.join(" · ");
  })();

  return (
    <div className="needs-card">
      <button
        type="button"
        className="needs-head"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <PetAvatar pet={pet} size={44} />
        <div className="needs-head-text">
          <span className="needs-name">{pet.name} needs attention</span>
          <span className="needs-summary">{summary}</span>
        </div>
        <span className="needs-count">{total}</span>
        <ChevronRight
          size={16}
          color="rgba(60, 60, 67, 0.45)"
          style={{
            transform: expanded ? "rotate(90deg)" : "none",
            transition: "transform 120ms ease",
            marginLeft: 4,
          }}
        />
      </button>
      {expanded ? (
        <ul className="needs-list-items">
          {overdueTasks.slice(0, 3).map((r) => {
            const Icon = iconForReminderType(r.type);
            return (
              <li key={`t-${r.id}`}>
                <span className="needs-row-icon" style={{ color: "#ba1a1a" }}>
                  <Icon size={14} />
                </span>
                <div>
                  <span className="needs-row-title">{getReminderName(r)} overdue</span>
                  <span className="needs-row-sub">
                    {new Date(r.dueDate).toLocaleDateString()}
                  </span>
                </div>
              </li>
            );
          })}
          {expiredVaccines.slice(0, 5 - Math.min(overdueTasks.length, 3)).map((v) => (
            <li key={`v-${v.id}`}>
              <span className="needs-row-icon" style={{ color: "#ba1a1a" }}>
                <ShieldCheck size={14} />
              </span>
              <div>
                <span className="needs-row-title">{v.vaccineName} vaccine</span>
                <span className="needs-row-sub">
                  Expired{" "}
                  {new Date(v.expirationDate as string).toLocaleDateString()}
                </span>
              </div>
            </li>
          ))}
          {total > 5 ? (
            <li className="needs-more">
              <Link href="/dashboard/reminders">View all {total} issues →</Link>
            </li>
          ) : null}
        </ul>
      ) : null}
      <style jsx>{`
        .needs-card {
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(186, 26, 26, 0.18);
        }
        .needs-head {
          width: 100%;
          background: transparent;
          border: none;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
          cursor: pointer;
        }
        .needs-head:hover {
          background: rgba(186, 26, 26, 0.04);
        }
        .needs-head-text {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }
        .needs-name {
          font-size: 15px;
          font-weight: 700;
          color: #16252e;
        }
        .needs-summary {
          font-size: 12px;
          color: rgba(60, 60, 67, 0.6);
          margin-top: 2px;
        }
        .needs-count {
          background: #ba1a1a;
          color: #fff;
          font-weight: 700;
          font-size: 12px;
          min-width: 28px;
          height: 26px;
          padding: 0 9px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .needs-list-items {
          list-style: none;
          margin: 0;
          padding: 0 14px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-top: 1px solid rgba(60, 60, 67, 0.08);
        }
        .needs-list-items li {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          padding-top: 10px;
        }
        .needs-row-icon {
          width: 24px;
          height: 24px;
          border-radius: 8px;
          background: rgba(186, 26, 26, 0.1);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .needs-row-title {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #16252e;
        }
        .needs-row-sub {
          display: block;
          font-size: 12px;
          color: rgba(60, 60, 67, 0.6);
          margin-top: 2px;
        }
        .needs-more {
          padding-top: 6px;
        }
        .needs-more :global(a) {
          color: #2a8fa8;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}

function QuickTile({
  href,
  icon,
  label,
  tint,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  tint: string;
}) {
  return (
    <Link href={href} className="quick-tile">
      <div className="quick-tile-icon" style={{ background: `${tint}22`, color: tint }}>
        {icon}
      </div>
      <div className="quick-tile-label">{label}</div>
      <style jsx>{`
        .quick-tile {
          background: #fff;
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-start;
          text-decoration: none;
          color: inherit;
          transition: transform 120ms ease, box-shadow 120ms ease;
        }
        .quick-tile:hover {
          box-shadow: 0 8px 22px rgba(0, 0, 0, 0.05);
        }
        .quick-tile:active {
          transform: scale(0.97);
        }
        .quick-tile-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .quick-tile-label {
          font-size: 13px;
          font-weight: 600;
          color: #16252e;
        }
      `}</style>
    </Link>
  );
}

function RecordsStat({
  icon,
  count,
  label,
  tint,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  tint: string;
}) {
  return (
    <div className="records-stat">
      <div className="records-stat-icon" style={{ background: `${tint}22`, color: tint }}>
        {icon}
      </div>
      <div>
        <div className="records-stat-count">{count}</div>
        <div className="records-stat-label">{label}</div>
      </div>
      <style jsx>{`
        .records-stat {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }
        .records-stat-icon {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .records-stat-count {
          font-size: 20px;
          font-weight: 700;
          color: #16252e;
          letter-spacing: -0.3px;
          line-height: 1;
        }
        .records-stat-label {
          font-size: 11px;
          font-weight: 600;
          color: rgba(60, 60, 67, 0.6);
          letter-spacing: 0.4px;
          text-transform: uppercase;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
