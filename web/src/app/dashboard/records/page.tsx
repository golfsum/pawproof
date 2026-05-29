"use client";

import { useMemo, useState } from "react";
import { FileText, Printer, Search, ShieldCheck, X } from "lucide-react";
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

// Records — mirrors the iOS Records screen, with desktop affordances.
// Search input + status filter chips up top. Per-pet "Print" button
// uses window.print() against a print-friendly stylesheet so the user
// can save a vet-ready PDF without leaving the page (printer dialog
// has "Save as PDF" on macOS and Windows).

type StatusFilter = "all" | "expired" | "expiring" | "current";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "expired", label: "Expired" },
  { key: "expiring", label: "Expiring soon" },
  { key: "current", label: "Current" },
];

function vaccineStatus(v: VaccineRecord): StatusFilter | "no_expiry" {
  if (!v.expirationDate) return "no_expiry";
  const d = daysUntil(v.expirationDate);
  if (d == null) return "no_expiry";
  if (d < 0) return "expired";
  if (d <= 30) return "expiring";
  return "current";
}

export default function RecordsPage() {
  const { pets, vaccines, documents, loading } = useUserData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [petFilter, setPetFilter] = useState<string | null>(null);

  const petGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return pets
      .filter((pet) => (petFilter ? pet.id === petFilter : true))
      .map((pet) => ({
        pet,
        vaccines: vaccines
          .filter((v) => v.petId === pet.id)
          .filter((v) => {
            if (statusFilter !== "all") {
              if (statusFilter === "current") {
                if (vaccineStatus(v) !== "current" && vaccineStatus(v) !== "no_expiry") {
                  return false;
                }
              } else if (vaccineStatus(v) !== statusFilter) {
                return false;
              }
            }
            if (query) {
              const hay = [v.vaccineName, v.clinicName ?? "", v.notes ?? "", v.lotNumber ?? ""]
                .join(" ")
                .toLowerCase();
              if (!hay.includes(query)) return false;
            }
            return true;
          })
          .sort(compareVaccinesByImportance),
        documents: documents
          .filter((d) => d.petId === pet.id)
          .filter((d) => {
            // Documents only get filtered by search + pet, not by
            // vaccine-status chips.
            if (query) {
              const hay = [d.title, d.kind, d.ocrText ?? ""].join(" ").toLowerCase();
              if (!hay.includes(query)) return false;
            }
            return statusFilter === "all"; // hide documents when a vaccine status filter is active
          })
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
      }))
      .filter((g) => g.vaccines.length > 0 || g.documents.length > 0);
  }, [pets, vaccines, documents, search, statusFilter, petFilter]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (petFilter ? 1 : 0);

  const totalVaccines = useMemo(
    () => petGroups.reduce((acc, g) => acc + g.vaccines.length, 0),
    [petGroups],
  );

  const handlePrintAll = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <>
      <div className="header-row">
        <PageTitle
          title="Records"
          subtitle="Vaccines and documents for every pet on your account."
        />
        <button
          type="button"
          onClick={handlePrintAll}
          className="print-all"
          disabled={petGroups.length === 0}
        >
          <Printer size={14} />
          <span>Print / save PDF</span>
        </button>
      </div>

      <div className="search-wrap no-print">
        <Search size={16} color="rgba(60, 60, 67, 0.45)" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vaccine, clinic, lot, document…"
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

      <div className="filter-row no-print">
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            selected={statusFilter === f.key}
            onClick={() => setStatusFilter(f.key)}
          />
        ))}
      </div>

      {pets.length > 1 ? (
        <div className="filter-row no-print">
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
        <div className="summary-row no-print">
          <span>
            {totalVaccines} match{totalVaccines === 1 ? "" : "es"}
          </span>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setPetFilter(null);
            }}
            className="clear-btn"
          >
            Clear filters
          </button>
        </div>
      ) : null}

      {loading ? (
        <EmptyCard title="Loading…" body="Fetching your records." />
      ) : petGroups.length === 0 ? (
        <EmptyCard
          title={vaccines.length + documents.length === 0 ? "No records yet" : "No matches"}
          body={
            vaccines.length + documents.length === 0
              ? "Add vaccine records manually or scan a document with Smart Scan in the iOS app."
              : "Try clearing filters or searching for a different term."
          }
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
                <button
                  type="button"
                  onClick={handlePrintAll}
                  className="pet-print no-print"
                  title={`Print ${pet.name}'s records`}
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>
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

      <p className="helper no-print">
        Use the PawProof mobile app to scan vaccine documents with Smart Scan
        and log meals, walks, and meds. Web is best for reviewing records,
        exporting PDFs, and managing your account.
      </p>

      <style jsx>{`
        .header-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .print-all {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #2a8fa8;
          color: #fff;
          border: none;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 12px;
          font-family: inherit;
        }
        .print-all:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .print-all:hover:not(:disabled) {
          background: #1e6c80;
        }

        .pet-print {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          background: #fff;
          color: #16252e;
          border: 1px solid rgba(60, 60, 67, 0.14);
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
        }
        .pet-print:hover {
          background: #f7f1e3;
        }

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
        .helper {
          margin-top: 24px;
          padding: 14px 16px;
          background: rgba(42, 143, 168, 0.08);
          border-radius: 14px;
          color: rgba(60, 60, 67, 0.75);
          font-size: 12px;
          line-height: 1.5;
        }

        /* Print stylesheet: hide chrome (sidebar, filters, helper,
           CTAs) so window.print() produces a clean records-only PDF. */
        @media print {
          :global(.ms-sidebar),
          :global(.ms-tabbar),
          :global(.ms-header),
          .no-print {
            display: none !important;
          }
          :global(.ms-main) {
            max-width: none !important;
            padding: 0 !important;
          }
          :global(.mobile-shell) {
            display: block !important;
            background: #fff !important;
          }
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
    const bits: string[] = [`Given ${fmtDate(v.dateGiven)}`];
    if (v.expirationDate) {
      bits.push(
        isExpired
          ? `Expired ${fmtDate(v.expirationDate)}`
          : `Expires ${fmtDate(v.expirationDate)}`,
      );
    }
    if (v.clinicName) bits.push(v.clinicName);
    if (v.lotNumber) bits.push(`Lot ${v.lotNumber}`);
    return bits.join(" · ");
  })();
  const chip = isExpired
    ? { label: "Expired", tone: "danger" as const }
    : isExpiringSoon
      ? { label: `${days}d left`, tone: "warning" as const }
      : days != null
        ? { label: "Current", tone: "success" as const }
        : { label: "No expiry", tone: "neutral" as const };
  return (
    <ListRow
      icon={<ShieldCheck size={18} />}
      iconTint={isExpired ? "danger" : isExpiringSoon ? "warning" : "primary"}
      title={v.vaccineName}
      subtitle={subtitle}
      trailing={<Chip label={chip.label} tone={chip.tone} />}
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
