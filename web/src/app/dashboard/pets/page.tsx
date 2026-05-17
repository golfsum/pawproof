"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { useUserData } from "@/lib/use-user-data";
import { daysUntil, isOverdue } from "@/lib/dates";
import { fmtDate } from "@/lib/utils";
import {
  Chip,
  EmptyCard,
  PageTitle,
  PetAvatar,
} from "@/components/app-ui";

// Pets tab — mirrors the iOS Pets screen. Each card shows the pet
// header plus a single priority-ordered preview line (Overdue >
// Expired > Due today > Expiring soon > Next > All caught up) so the
// user always sees the most-urgent thing per pet.

type PreviewTone = "danger" | "warning" | "muted" | "success";
interface Preview {
  label: string;
  text: string;
  tone: PreviewTone;
}

export default function PetsPage() {
  const { pets, reminders, vaccines, loading } = useUserData();

  const previews = useMemo(() => {
    const out: Record<string, Preview> = {};
    for (const pet of pets) {
      out[pet.id] = pickPetPreview(pet.id, reminders, vaccines);
    }
    return out;
  }, [pets, reminders, vaccines]);

  return (
    <>
      <PageTitle
        title="My Pets"
        subtitle={
          pets.length === 0
            ? "Add pets from the PawProof iOS app — they'll show up here automatically."
            : `${pets.length} pet${pets.length === 1 ? "" : "s"} on file`
        }
      />

      {loading ? (
        <EmptyCard title="Loading…" body="Fetching your pets." />
      ) : pets.length === 0 ? (
        <EmptyCard
          title="No pets yet"
          body="Open the PawProof iOS app and tap + to add your first pet. Pets sync to the web automatically."
        />
      ) : (
        <div className="pet-list">
          {pets.map((pet) => {
            const preview = previews[pet.id];
            const stats = {
              vaccines: vaccines.filter((v) => v.petId === pet.id).length,
              reminders: reminders.filter((r) => r.petId === pet.id && !r.isCompleted).length,
            };
            return (
              <Link key={pet.id} href="/dashboard/pets" className="pet-link">
                <div className="pet-card">
                  <div className="pet-card-header">
                    <PetAvatar name={pet.name} size={56} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="pet-name">{pet.name}</div>
                      <div className="pet-sub">
                        <span style={{ textTransform: "capitalize" }}>{pet.species}</span>
                        {pet.breed ? ` · ${pet.breed}` : ""}
                        {pet.birthday ? ` · born ${fmtDate(pet.birthday)}` : ""}
                      </div>
                    </div>
                    <ChevronRight size={18} color="rgba(60, 60, 67, 0.3)" />
                  </div>

                  <div className="pet-preview">
                    <Chip
                      label={preview.label}
                      tone={
                        preview.tone === "danger"
                          ? "danger"
                          : preview.tone === "warning"
                            ? "warning"
                            : preview.tone === "success"
                              ? "success"
                              : "neutral"
                      }
                    />
                    <span className="pet-preview-text">{preview.text}</span>
                  </div>

                  <div className="pet-stats">
                    <Stat n={stats.vaccines} label="vaccines" />
                    <Stat n={stats.reminders} label="active reminders" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .pet-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pet-link {
          color: inherit;
          text-decoration: none;
        }
        .pet-card {
          background: #fff;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .pet-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pet-name {
          font-size: 19px;
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
        .pet-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
      `}</style>
    </>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="stat">
      <div className="stat-n">{n}</div>
      <div className="stat-l">{label}</div>
      <style jsx>{`
        .stat {
          background: #fbfaf6;
          border-radius: 10px;
          padding: 10px 12px;
          text-align: center;
        }
        .stat-n {
          font-size: 18px;
          font-weight: 700;
          color: #16252e;
          letter-spacing: -0.3px;
        }
        .stat-l {
          font-size: 11px;
          font-weight: 600;
          color: rgba(60, 60, 67, 0.6);
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}

// Pet preview picker — picks the single most-urgent item across this
// pet's reminders + vaccines. Mirrors the mobile pickPetPreview.
function pickPetPreview(
  petId: string,
  reminders: ReturnType<typeof useUserData>["reminders"],
  vaccines: ReturnType<typeof useUserData>["vaccines"],
): Preview {
  const petReminders = reminders.filter((r) => r.petId === petId && !r.isCompleted);
  const petVaccines = vaccines.filter((v) => v.petId === petId);

  // 1. Overdue task reminders (skip vaccination type — those get the
  // Expired treatment via the vaccine record below).
  const overdueTask = petReminders
    .filter((r) => isOverdue(r.dueDate) && r.type !== "vaccination")
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))[0];
  if (overdueTask) {
    return {
      label: "Overdue",
      text: `${overdueTask.title} · ${fmtDate(overdueTask.dueDate)}`,
      tone: "danger",
    };
  }

  // 2. Expired vaccine.
  const expiredVax = petVaccines
    .filter((v) => v.expirationDate && (daysUntil(v.expirationDate) ?? 999) < 0)
    .sort(
      (a, b) =>
        +new Date(b.expirationDate as string) -
        +new Date(a.expirationDate as string),
    )[0];
  if (expiredVax) {
    return {
      label: "Expired",
      text: `${expiredVax.vaccineName} vaccine · ${fmtDate(expiredVax.expirationDate)}`,
      tone: "danger",
    };
  }

  // 3. Due today.
  const todayTask = petReminders
    .filter((r) => {
      if (isOverdue(r.dueDate)) return false;
      const d = daysUntil(r.dueDate);
      return d != null && d === 0;
    })
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))[0];
  if (todayTask) {
    return {
      label: "Due today",
      text: `${todayTask.title} · ${new Date(todayTask.dueDate).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`,
      tone: "warning",
    };
  }

  // 4. Vaccine expiring soon (<= 60 days).
  const expiringSoon = petVaccines
    .filter((v) => {
      if (!v.expirationDate) return false;
      const d = daysUntil(v.expirationDate);
      return d != null && d >= 0 && d <= 60;
    })
    .sort(
      (a, b) =>
        +new Date(a.expirationDate as string) -
        +new Date(b.expirationDate as string),
    )[0];
  if (expiringSoon) {
    const d = daysUntil(expiringSoon.expirationDate as string) ?? 0;
    return {
      label: "Expiring soon",
      text: `${expiringSoon.vaccineName} vaccine · In ${d} day${d === 1 ? "" : "s"}`,
      tone: "warning",
    };
  }

  // 5. Next future reminder.
  const future = petReminders
    .filter((r) => {
      const d = daysUntil(r.dueDate);
      return d != null && d > 0;
    })
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))[0];
  if (future) {
    return {
      label: "Next",
      text: `${future.title} · ${fmtDate(future.dueDate)}`,
      tone: "muted",
    };
  }

  return { label: "All caught up", text: "No urgent care this week", tone: "success" };
}
