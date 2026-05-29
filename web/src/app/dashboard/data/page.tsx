"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Archive,
  Download,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { useUserData } from "@/lib/use-user-data";
import { db } from "@/lib/firebase";
import {
  Card,
  EmptyCard,
  PageTitle,
  SectionLabel,
} from "@/components/app-ui";

// Your Data — web companion to the mobile Data Export screen. The
// JSON backup runs entirely in the browser (no server route needed)
// by reading every subcollection under /users/{uid} and packaging
// them into a single download. The PDF records book is intentionally
// a mobile-only path because expo-print lives on the device; the
// web shows the user where to find it instead of building a parallel
// generator.

interface BackupShape {
  exportedAt: string;
  uid: string;
  email: string | null;
  pets: Array<Record<string, unknown>>;
  vaccines: Array<Record<string, unknown>>;
  reminders: Array<Record<string, unknown>>;
  journalEntries: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  medications: Array<Record<string, unknown>>;
  weights: Array<Record<string, unknown>>;
  petShares: Array<Record<string, unknown>>;
}

export default function DataExportPage() {
  const { user, profile } = useAuth();
  const { pets, vaccines, reminders, documents, entries } = useUserData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportBackup = async () => {
    if (!user || !db) {
      setError("You need to be signed in to export.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Pull every subcollection. Most are already streaming via
      // useUserData, but we re-fetch with getDocs here to capture
      // anything beyond the listener's limit (200) and the smaller
      // collections (medications, weights, pet_shares) that the
      // dashboard doesn't subscribe to.
      const sub = async (path: string): Promise<Array<Record<string, unknown>>> => {
        try {
          const snap = await getDocs(collection(db!, "users", user.uid, path));
          return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch {
          return [];
        }
      };

      // Top-level pet_shares is queried by ownerUid, but we only have
      // read access to docs where the user is owner or invitee. We
      // include them best-effort; failures just drop the array.
      const sharesQuery = async (): Promise<Array<Record<string, unknown>>> => {
        try {
          const snap = await getDocs(collection(db!, "pet_shares"));
          return snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter(
              (s) =>
                (s as { ownerUid?: string }).ownerUid === user.uid ||
                (s as { inviteeUid?: string | null }).inviteeUid === user.uid,
            );
        } catch {
          return [];
        }
      };

      const [
        petsAll,
        vaccinesAll,
        remindersAll,
        entriesAll,
        documentsAll,
        medicationsAll,
        weightsAll,
        sharesAll,
      ] = await Promise.all([
        sub("pets"),
        sub("vaccines"),
        sub("reminders"),
        sub("journalEntries"),
        sub("documents"),
        sub("medications"),
        sub("weights"),
        sharesQuery(),
      ]);

      const backup: BackupShape = {
        exportedAt: new Date().toISOString(),
        uid: user.uid,
        email: user.email ?? null,
        pets: petsAll,
        vaccines: vaccinesAll,
        reminders: remindersAll,
        journalEntries: entriesAll,
        documents: documentsAll,
        medications: medicationsAll,
        weights: weightsAll,
        petShares: sharesAll,
      };

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const stamp = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pawproof-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Couldn't build the backup: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle
        title="Your data"
        subtitle="Export a copy or review what PawProof has on file."
      />

      <SectionLabel>Backup</SectionLabel>
      <Card>
        <div className="row">
          <div className="row-icon">
            <Archive size={20} />
          </div>
          <div className="row-text">
            <div className="row-title">Full backup (JSON)</div>
            <div className="row-body">
              A single file with every pet, vaccine, document link,
              reminder, and journal entry on this account. Saves to
              Downloads as <code>pawproof-backup-YYYY-MM-DD.json</code>.
            </div>
          </div>
          <button
            type="button"
            onClick={exportBackup}
            disabled={busy}
            className="primary-cta"
          >
            <Download size={14} />
            <span>{busy ? "Exporting…" : "Export backup"}</span>
          </button>
        </div>
      </Card>

      <SectionLabel>Records book</SectionLabel>
      <Card>
        <div className="row">
          <div className="row-icon">
            <FileText size={20} />
          </div>
          <div className="row-text">
            <div className="row-title">Pet records book (PDF)</div>
            <div className="row-body">
              A polished, vet-ready PDF for each pet. Vaccines, weight,
              allergies, emergency contacts, recent activity, microchip
              number. Generated on-device in the PawProof iOS app — open
              Settings → Your data on your phone to build one.
            </div>
            {!profile?.isPremium ? (
              <div className="row-note">
                Records book PDFs are a PawProof Plus feature.
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <SectionLabel>What&apos;s on your account</SectionLabel>
      <Card>
        <div className="counts-grid">
          <Stat label="Pets" count={pets.length} />
          <Stat label="Vaccines" count={vaccines.length} />
          <Stat label="Reminders" count={reminders.length} />
          <Stat label="Documents" count={documents.length} />
          <Stat label="Activity" count={entries.length} suffix="recent" />
        </div>
      </Card>

      <SectionLabel>Where your data lives</SectionLabel>
      <Card>
        <div className="row">
          <div className="row-icon trust">
            <ShieldCheck size={18} />
          </div>
          <div className="row-text">
            <div className="row-title">Stored privately under your account</div>
            <div className="row-body">
              Records sync to your PawProof account on Google Cloud.
              Delete your account and everything is wiped within 30 days.
              Email{" "}
              <a href="mailto:support@pawproof.app">support@pawproof.app</a>{" "}
              with any data questions.
            </div>
          </div>
        </div>
      </Card>

      {error ? (
        <Card>
          <div className="row">
            <div className="row-icon danger">
              <AlertTriangle size={18} />
            </div>
            <div className="row-text">
              <div className="row-title">Export didn&apos;t finish</div>
              <div className="row-body">{error}</div>
            </div>
          </div>
        </Card>
      ) : null}

      {pets.length === 0 ? (
        <EmptyCard
          title="No pets yet"
          body="Add your first pet in the PawProof iOS app to start tracking care."
        />
      ) : null}

      <style jsx>{`
        .row {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }
        .row-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(42, 143, 168, 0.12);
          color: #2a8fa8;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .row-icon.trust {
          background: rgba(42, 143, 168, 0.12);
        }
        .row-icon.danger {
          background: #fde2e1;
          color: #ba1a1a;
        }
        .row-text {
          flex: 1;
        }
        .row-title {
          font-size: 15px;
          font-weight: 700;
          color: #16252e;
        }
        .row-body {
          font-size: 13px;
          color: rgba(60, 60, 67, 0.7);
          line-height: 1.55;
          margin-top: 4px;
        }
        .row-body :global(code) {
          background: #f3eddf;
          padding: 1px 5px;
          border-radius: 4px;
          font-size: 12px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .row-note {
          font-size: 12px;
          color: #1e6c80;
          margin-top: 6px;
          font-weight: 600;
        }
        .primary-cta {
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
          font-family: inherit;
          flex-shrink: 0;
        }
        .primary-cta:hover:not(:disabled) {
          background: #1e6c80;
        }
        .primary-cta:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .counts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
        }
      `}</style>
    </>
  );
}

function Stat({
  label,
  count,
  suffix,
}: {
  label: string;
  count: number;
  suffix?: string;
}) {
  return (
    <div className="stat">
      <div className="num">{count}</div>
      <div className="lbl">
        {label}
        {suffix ? <span className="suffix"> · {suffix}</span> : null}
      </div>
      <style jsx>{`
        .stat {
          background: #fbf5ea;
          padding: 12px;
          border-radius: 10px;
        }
        .num {
          font-size: 22px;
          font-weight: 700;
          color: #16252e;
          letter-spacing: -0.3px;
        }
        .lbl {
          font-size: 11px;
          font-weight: 600;
          color: rgba(60, 60, 67, 0.6);
          letter-spacing: 0.4px;
          text-transform: uppercase;
          margin-top: 4px;
        }
        .suffix {
          letter-spacing: 0;
          text-transform: none;
          color: rgba(60, 60, 67, 0.45);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
