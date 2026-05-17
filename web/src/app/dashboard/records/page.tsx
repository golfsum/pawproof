"use client";

import { useMemo } from "react";
import { FileText, ShieldCheck } from "lucide-react";
import { useUserData } from "@/lib/use-user-data";
import { daysUntil } from "@/lib/dates";
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
import type { PetDocument, VaccineRecord } from "@/lib/types";

// Records tab — mirrors the iOS Records screen. Per-pet sections,
// vaccines first (sorted expired → expiring → current → no
// expiration), then documents. Vaccine cards spell out "Given /
// Expires / Expired" so the dates are never ambiguous.

export default function RecordsPage() {
  const { pets, vaccines, documents, loading } = useUserData();

  const petGroups = useMemo(() => {
    return pets
      .map((pet) => ({
        pet,
        vaccines: vaccines
          .filter((v) => v.petId === pet.id)
          .sort(compareVaccinesByImportance),
        documents: documents
          .filter((d) => d.petId === pet.id)
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
      }))
      .filter((g) => g.vaccines.length > 0 || g.documents.length > 0);
  }, [pets, vaccines, documents]);

  return (
    <>
      <PageTitle
        title="Records"
        subtitle="Vaccines and documents for every pet on your account."
      />

      {loading ? (
        <EmptyCard title="Loading…" body="Fetching your records." />
      ) : petGroups.length === 0 ? (
        <EmptyCard
          title="No records yet"
          body="Add vaccine records manually or scan a document with Smart Scan in the iOS app."
        />
      ) : (
        <div className="record-groups">
          {petGroups.map(({ pet, vaccines: vs, documents: ds }) => (
            <div key={pet.id} className="record-group">
              <div className="record-pet-header">
                <PetAvatar pet={pet} size={40} />
                <div style={{ flex: 1 }}>
                  <div className="record-pet-name">{pet.name}</div>
                  <div className="record-pet-sub">
                    {vs.length} {vs.length === 1 ? "vaccine" : "vaccines"} · {ds.length}{" "}
                    {ds.length === 1 ? "document" : "documents"}
                  </div>
                </div>
              </div>

              {vs.length > 0 ? (
                <>
                  <SectionLabel>Vaccinations · {vs.length}</SectionLabel>
                  <Card noPadding>
                    {vs.map((v) => (
                      <VaccineRow key={v.id} v={v} />
                    ))}
                  </Card>
                </>
              ) : null}

              {ds.length > 0 ? (
                <>
                  <SectionLabel>Documents · {ds.length}</SectionLabel>
                  <Card noPadding>
                    {ds.map((d) => (
                      <ListRow
                        key={d.id}
                        icon={<FileText size={18} />}
                        iconTint="warning"
                        title={d.title}
                        subtitle={
                          <>
                            <span style={{ textTransform: "capitalize" }}>
                              {d.kind.replace("_", " ")}
                            </span>
                            {" · "}
                            {fmtDate(d.createdAt)}
                          </>
                        }
                        trailing={
                          d.fileUrl ? (
                            <a
                              href={d.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#2a8fa8",
                                textDecoration: "none",
                              }}
                            >
                              Open
                            </a>
                          ) : null
                        }
                      />
                    ))}
                  </Card>
                </>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .record-groups {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .record-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .record-pet-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 4px;
          border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
          margin-bottom: 4px;
        }
        .record-pet-name {
          font-size: 18px;
          font-weight: 700;
          color: #16252e;
          letter-spacing: -0.2px;
        }
        .record-pet-sub {
          font-size: 12px;
          color: rgba(60, 60, 67, 0.6);
          margin-top: 2px;
        }
      `}</style>
    </>
  );
}

function VaccineRow({ v }: { v: VaccineRecord }) {
  const days = v.expirationDate ? daysUntil(v.expirationDate) : null;
  const isExpired = days != null && days < 0;
  const isExpiringSoon = days != null && days >= 0 && days <= 30;
  const subtitle = (() => {
    if (v.expirationDate) {
      if (isExpired) {
        return `Given ${fmtDate(v.dateGiven)} · Expired ${fmtDate(v.expirationDate)}`;
      }
      return `Given ${fmtDate(v.dateGiven)} · Expires ${fmtDate(v.expirationDate)}`;
    }
    return `Given ${fmtDate(v.dateGiven)}`;
  })();
  const chip = isExpired
    ? { label: "Expired", tone: "danger" as const }
    : isExpiringSoon
      ? { label: `${days}d left`, tone: "warning" as const }
      : days != null
        ? { label: "Current", tone: "success" as const }
        : null;
  return (
    <ListRow
      icon={<ShieldCheck size={18} />}
      iconTint={isExpired ? "danger" : isExpiringSoon ? "warning" : "primary"}
      title={v.vaccineName}
      subtitle={subtitle}
      trailing={chip ? <Chip label={chip.label} tone={chip.tone} /> : null}
    />
  );
}

// Importance-first sort that matches the mobile app: expired first,
// expiring within 60 days next, then current by soonest expiration,
// then no-expiration entries by newest given date.
function compareVaccinesByImportance(a: VaccineRecord, b: VaccineRecord): number {
  const bucket = (v: VaccineRecord): number => {
    if (!v.expirationDate) return 3;
    const days = daysUntil(v.expirationDate);
    if (days == null) return 3;
    if (days < 0) return 0;
    if (days <= 60) return 1;
    return 2;
  };
  const ba = bucket(a);
  const bb = bucket(b);
  if (ba !== bb) return ba - bb;
  if (ba === 0) {
    return +new Date(b.expirationDate as string) - +new Date(a.expirationDate as string);
  }
  if (ba === 1 || ba === 2) {
    return +new Date(a.expirationDate as string) - +new Date(b.expirationDate as string);
  }
  return +new Date(b.dateGiven) - +new Date(a.dateGiven);
}
