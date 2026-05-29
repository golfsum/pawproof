"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Fingerprint,
  Phone,
  Pill,
  ShieldCheck,
  Smile,
  Stethoscope,
} from "lucide-react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db, isTransientAuthError } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useUserData } from "@/lib/use-user-data";
import { daysUntil } from "@/lib/dates";
import { fmtDate } from "@/lib/utils";
import { Chip, EmptyCard, PageTitle, PetAvatar } from "@/components/app-ui";
import type { Pet, VaccineRecord } from "@/lib/types";

// Read-only web version of the mobile emergency card
// (app/pet/emergency/[id].tsx). Same sections — critical alerts, owner,
// vet, emergency contact, IDs, current meds, vaccine status — built for
// a vet/sitter to read at a glance. All data syncs from the app; the
// web never edits it.

interface MedicationLite {
  id: string;
  petId: string;
  name: string;
  dosage?: string;
  frequency: string;
  instructions?: string;
  isActive: boolean;
}

const SPECIES_LABEL: Record<string, string> = {
  dog: "Dog",
  cat: "Cat",
  bird: "Bird",
  rabbit: "Rabbit",
  reptile: "Reptile",
  fish: "Fish",
  small_mammal: "Small mammal",
  other: "Pet",
};

const FREQUENCY_SHORT: Record<string, string> = {
  once_daily: "1x daily",
  twice_daily: "2x daily",
  three_times_daily: "3x daily",
  every_other_day: "every 2 days",
  weekly: "weekly",
  monthly: "monthly",
  as_needed: "as needed",
};

function fmtPetAge(birthday?: string | null, approxAgeMonths?: number | null): string | null {
  let months: number | null = null;
  if (birthday) {
    const b = new Date(birthday);
    if (!Number.isNaN(b.getTime())) {
      const now = new Date();
      months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
      if (now.getDate() < b.getDate()) months -= 1;
    }
  } else if (approxAgeMonths != null) {
    months = approxAgeMonths;
  }
  if (months == null || months < 0) return null;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${months} mo`;
  if (rem === 0) return `${years} yr`;
  return `${years} yr ${rem} mo`;
}

function fmtWeight(kg?: number | null): string | null {
  if (kg == null) return null;
  const lb = kg * 2.2046226218;
  return `${kg.toFixed(1)} kg · ${lb.toFixed(1)} lb`;
}

// Live subscription to the user's medications. Kept local to this page
// so the shared useUserData hook stays unchanged.
function useMedications(uid: string | null): MedicationLite[] {
  const [meds, setMeds] = useState<MedicationLite[]>([]);
  useEffect(() => {
    if (!uid || !db) {
      setMeds([]);
      return;
    }
    const q = query(collection(db, "users", uid, "medications"));
    return onSnapshot(
      q,
      (snap) => {
        setMeds(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MedicationLite, "id">) })),
        );
      },
      (err) => {
        if (!isTransientAuthError(err)) console.warn("[emergency] medications:", err);
      },
    );
  }, [uid]);
  return meds;
}

export default function EmergencyPage() {
  const { user, profile } = useAuth();
  const { pets, vaccines, loading } = useUserData();
  const meds = useMedications(user?.uid ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedPet = useMemo(() => {
    if (pets.length === 0) return null;
    return pets.find((p) => p.id === selectedId) ?? pets[0];
  }, [pets, selectedId]);

  const ownerName = profile?.displayName ?? user?.displayName ?? null;
  const ownerEmail = profile?.email ?? user?.email ?? null;

  return (
    <>
      <PageTitle
        title="Emergency card"
        subtitle="Read-at-a-glance info for a vet or sitter. Edit these details in the PawProof app."
      />

      {loading ? (
        <EmptyCard title="Loading…" body="Fetching your pets." />
      ) : !selectedPet ? (
        <EmptyCard
          title="No pets yet"
          body="Add a pet in the PawProof iOS app — emergency cards show up here automatically."
        />
      ) : (
        <>
          {pets.length > 1 ? (
            <div className="pet-picker">
              {pets.map((p) => (
                <Chip
                  key={p.id}
                  label={p.name}
                  selected={selectedPet.id === p.id}
                  onClick={() => setSelectedId(p.id)}
                />
              ))}
            </div>
          ) : null}

          <EmergencyCardView
            pet={selectedPet}
            vaccines={vaccines.filter((v) => v.petId === selectedPet.id)}
            meds={meds.filter((m) => m.petId === selectedPet.id && m.isActive)}
            ownerName={ownerName}
            ownerEmail={ownerEmail}
          />
        </>
      )}

      <style jsx>{`
        .pet-picker {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 16px;
        }
      `}</style>
    </>
  );
}

function EmergencyCardView({
  pet,
  vaccines,
  meds,
  ownerName,
  ownerEmail,
}: {
  pet: Pet;
  vaccines: VaccineRecord[];
  meds: MedicationLite[];
  ownerName: string | null;
  ownerEmail: string | null;
}) {
  const recentVaccines = [...vaccines]
    .sort((a, b) => +new Date(b.dateGiven) - +new Date(a.dateGiven))
    .slice(0, 5);

  const age = fmtPetAge(pet.birthday, pet.approxAgeMonths);
  const weight = fmtWeight(pet.weightKg);
  const subParts = [SPECIES_LABEL[pet.species] ?? "Pet", pet.breed, age].filter(Boolean);

  return (
    <div className="ec">
      <div className="hero">
        <PetAvatar pet={pet} size={120} />
        <div className="hero-name">{pet.name}</div>
        <div className="hero-sub">{subParts.join(" · ")}</div>
        {weight ? <div className="hero-sub">{weight}</div> : null}
      </div>

      {pet.allergies ? (
        <Section tone="danger" icon={<AlertTriangle size={16} />} title="Allergies">
          <p className="critical">{pet.allergies}</p>
        </Section>
      ) : null}

      {pet.emergencyNotes ? (
        <Section tone="danger" icon={<AlertTriangle size={16} />} title="Emergency notes">
          <p className="critical">{pet.emergencyNotes}</p>
        </Section>
      ) : null}

      {ownerName || ownerEmail ? (
        <Section tone="primary" icon={<Smile size={16} />} title="Owner">
          {ownerName ? <p className="contact-name">{ownerName}</p> : null}
          {ownerEmail ? <p className="muted">{ownerEmail}</p> : null}
        </Section>
      ) : null}

      <Section tone="primary" icon={<Stethoscope size={16} />} title="Vet">
        {pet.vetName ? <p className="contact-name">{pet.vetName}</p> : null}
        {pet.vetPhone ? (
          <CallButton phone={pet.vetPhone} />
        ) : (
          <p className="muted">No vet phone added</p>
        )}
      </Section>

      {pet.emergencyContactName || pet.emergencyContactPhone ? (
        <Section tone="primary" icon={<Phone size={16} />} title="Emergency contact">
          {pet.emergencyContactName ? (
            <p className="contact-name">{pet.emergencyContactName}</p>
          ) : null}
          {pet.emergencyContactPhone ? <CallButton phone={pet.emergencyContactPhone} /> : null}
        </Section>
      ) : null}

      <Section tone="muted" icon={<Fingerprint size={16} />} title="Identification">
        <InfoRow label="Date of birth" value={pet.birthday ? fmtDate(pet.birthday) : "Unknown"} />
        <InfoRow label="Microchip" value={pet.microchip || "Not registered"} />
        <InfoRow label="Insurance" value={pet.insurance || "None"} />
      </Section>

      {meds.length > 0 ? (
        <Section tone="muted" icon={<Pill size={16} />} title="Current medications">
          {meds.map((m) => (
            <div key={m.id} className="med">
              <div className="med-name">{m.name}</div>
              <div className="med-meta">
                {m.dosage ? `${m.dosage} · ` : ""}
                {FREQUENCY_SHORT[m.frequency] ?? m.frequency}
                {m.instructions ? ` · ${m.instructions}` : ""}
              </div>
            </div>
          ))}
        </Section>
      ) : null}

      {recentVaccines.length > 0 ? (
        <Section tone="muted" icon={<ShieldCheck size={16} />} title="Vaccine status">
          {recentVaccines.map((v) => {
            const days = v.expirationDate ? daysUntil(v.expirationDate) : null;
            const expired = days != null && days < 0;
            const soon = days != null && days >= 0 && days <= 30;
            let label: string;
            if (v.expirationDate) {
              if (expired) label = `Expired ${fmtDate(v.expirationDate)}`;
              else if (soon) label = `Expires in ${days}d · ${fmtDate(v.expirationDate)}`;
              else label = `Current until ${fmtDate(v.expirationDate)}`;
            } else {
              label = `Given ${fmtDate(v.dateGiven)}`;
            }
            return (
              <div key={v.id} className="vacc">
                <div className="vacc-name">{v.vaccineName}</div>
                <div className={`vacc-status${expired ? " is-expired" : soon ? " is-soon" : ""}`}>
                  {label}
                </div>
              </div>
            );
          })}
        </Section>
      ) : null}

      <p className="footer">Generated by PawProof · Not a medical document</p>

      <style jsx>{`
        .ec {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 16px 0 8px;
        }
        .hero-name {
          font-size: 30px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #16252e;
          margin-top: 8px;
        }
        .hero-sub {
          font-size: 15px;
          color: rgba(60, 60, 67, 0.6);
        }
        .critical {
          font-size: 16px;
          font-weight: 600;
          line-height: 1.4;
          color: #16252e;
          margin: 0;
        }
        .contact-name {
          font-size: 16px;
          font-weight: 600;
          color: #16252e;
          margin: 0;
        }
        .muted {
          font-size: 14px;
          color: rgba(60, 60, 67, 0.6);
          margin: 0;
        }
        .med {
          padding: 2px 0;
        }
        .med-name {
          font-size: 14px;
          font-weight: 600;
          color: #16252e;
        }
        .med-meta {
          font-size: 12px;
          color: rgba(60, 60, 67, 0.6);
        }
        .vacc {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 2px 0;
        }
        .vacc-name {
          font-size: 14px;
          font-weight: 600;
          color: #16252e;
        }
        .vacc-status {
          font-size: 12px;
          color: rgba(60, 60, 67, 0.6);
          text-align: right;
          flex-shrink: 0;
        }
        .vacc-status.is-expired {
          color: #ba1a1a;
          font-weight: 700;
        }
        .vacc-status.is-soon {
          color: #92400e;
          font-weight: 700;
        }
        .footer {
          font-size: 11px;
          color: rgba(60, 60, 67, 0.4);
          text-align: center;
          margin: 12px 0 0;
        }
      `}</style>
    </div>
  );
}

function Section({
  tone,
  icon,
  title,
  children,
}: {
  tone: "danger" | "primary" | "muted";
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={`sec sec-${tone}`}>
      <div className="sec-head">
        <span className="sec-icon">{icon}</span>
        <span className="sec-title">{title}</span>
      </div>
      <div className="sec-body">{children}</div>

      <style jsx>{`
        .sec {
          border-radius: 16px;
          padding: 14px 16px;
          border: 1px solid transparent;
        }
        .sec-danger {
          background: #fde2e1;
          border-color: rgba(186, 26, 26, 0.25);
        }
        .sec-primary {
          background: #e1f1f5;
          border-color: rgba(42, 143, 168, 0.25);
        }
        .sec-muted {
          background: #fff;
          border-color: rgba(60, 60, 67, 0.14);
        }
        .sec-head {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .sec-icon {
          display: inline-flex;
        }
        .sec-danger .sec-icon {
          color: #991b1b;
        }
        .sec-primary .sec-icon {
          color: #1e6c80;
        }
        .sec-muted .sec-icon {
          color: rgba(60, 60, 67, 0.55);
        }
        .sec-title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .sec-danger .sec-title {
          color: #991b1b;
        }
        .sec-primary .sec-title {
          color: #1e6c80;
        }
        .sec-muted .sec-title {
          color: rgba(60, 60, 67, 0.55);
        }
        .sec-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
      `}</style>
    </div>
  );
}

function CallButton({ phone }: { phone: string }) {
  return (
    <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="call">
      <Phone size={15} />
      {phone}
      <style jsx>{`
        .call {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          align-self: flex-start;
          margin-top: 2px;
          padding: 9px 14px;
          border-radius: 10px;
          background: #2a8fa8;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
        }
        .call:hover {
          background: #1e6c80;
        }
      `}</style>
    </a>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
      <style jsx>{`
        .info {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 3px 0;
        }
        .info-label {
          font-size: 13px;
          font-weight: 600;
          color: rgba(60, 60, 67, 0.6);
        }
        .info-value {
          font-size: 14px;
          color: #16252e;
          text-align: right;
        }
      `}</style>
    </div>
  );
}
