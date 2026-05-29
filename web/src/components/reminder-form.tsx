"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Pet, ReminderCategory, RepeatType } from "@/lib/types";
import {
  REMINDER_CATEGORIES,
  DEFAULT_REPEAT_BY_CATEGORY,
  placeholderForCategory,
  createReminders,
} from "@/lib/reminder-write";
import { Chip } from "./app-ui";

// Modal form for creating a reminder from the web. Writes the same
// Firestore shape the iOS app writes (see lib/reminder-write.ts), so a
// reminder added here syncs straight back to the phone. One caveat the
// copy calls out: the web can't schedule a push notification, so the
// reminder fires its notification only after the app next opens.

const REPEAT_OPTIONS: { key: RepeatType; label: string }[] = [
  { key: "none", label: "Does not repeat" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
  { key: "custom_days", label: "Every N days" },
];

function defaultDueLocal(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReminderForm({
  uid,
  pets,
  open,
  onClose,
}: {
  uid: string;
  pets: Pet[];
  open: boolean;
  onClose: () => void;
}) {
  const [petIds, setPetIds] = useState<string[]>([]);
  const [category, setCategory] = useState<ReminderCategory>("feeding");
  const [repeatEdited, setRepeatEdited] = useState(false);
  const [repeatType, setRepeatType] = useState<RepeatType>("daily");
  const [repeatInterval, setRepeatInterval] = useState("2");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [due, setDue] = useState(defaultDueLocal());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset to a clean slate every time the modal opens. Preselect the
  // only pet when the user has just one.
  useEffect(() => {
    if (!open) return;
    setPetIds(pets.length === 1 ? [pets[0].id] : []);
    setCategory("feeding");
    setRepeatEdited(false);
    setRepeatType(DEFAULT_REPEAT_BY_CATEGORY.feeding);
    setRepeatInterval("2");
    setName("");
    setNotes("");
    setDue(defaultDueLocal());
    setSubmitting(false);
    setError(null);
  }, [open, pets]);

  if (!open) return null;

  const togglePet = (id: string) =>
    setPetIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const pickCategory = (c: ReminderCategory) => {
    setCategory(c);
    if (!repeatEdited) setRepeatType(DEFAULT_REPEAT_BY_CATEGORY[c]);
  };

  const submit = async () => {
    setError(null);
    if (petIds.length === 0) {
      setError("Pick at least one pet.");
      return;
    }
    const dueDate = new Date(due);
    if (Number.isNaN(dueDate.getTime())) {
      setError("Choose a valid date and time.");
      return;
    }
    setSubmitting(true);
    try {
      await createReminders(uid, {
        petIds,
        category,
        name,
        notes,
        dueDate,
        repeatType,
        repeatInterval: repeatType === "custom_days" ? Number(repeatInterval) : null,
      });
      onClose();
    } catch (e) {
      console.warn("[reminder-form] create failed:", e);
      setError("Could not save the reminder. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="rf-backdrop" onClick={onClose}>
      <div className="rf-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rf-head">
          <h2 className="rf-title">New reminder</h2>
          <button type="button" className="rf-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="rf-body">
          {pets.length === 0 ? (
            <p className="rf-note">Add a pet in the PawProof app first.</p>
          ) : (
            <>
              <label className="rf-label">{pets.length > 1 ? "Pets" : "Pet"}</label>
              <div className="rf-chips">
                {pets.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.name}
                    selected={petIds.includes(p.id)}
                    onClick={() => togglePet(p.id)}
                  />
                ))}
              </div>
            </>
          )}

          <label className="rf-label">Category</label>
          <div className="rf-chips">
            {REMINDER_CATEGORIES.map((c) => (
              <Chip
                key={c.key}
                label={c.label}
                selected={category === c.key}
                onClick={() => pickCategory(c.key)}
              />
            ))}
          </div>

          <label className="rf-label" htmlFor="rf-name">
            Name
          </label>
          <input
            id="rf-name"
            className="rf-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={placeholderForCategory(category)}
          />

          <label className="rf-label" htmlFor="rf-due">
            Due date &amp; time
          </label>
          <input
            id="rf-due"
            type="datetime-local"
            className="rf-input"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />

          <label className="rf-label" htmlFor="rf-repeat">
            Repeat
          </label>
          <select
            id="rf-repeat"
            className="rf-input"
            value={repeatType}
            onChange={(e) => {
              setRepeatEdited(true);
              setRepeatType(e.target.value as RepeatType);
            }}
          >
            {REPEAT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>

          {repeatType === "custom_days" ? (
            <input
              type="number"
              min={1}
              className="rf-input"
              value={repeatInterval}
              onChange={(e) => setRepeatInterval(e.target.value)}
              placeholder="Number of days"
              aria-label="Repeat every N days"
            />
          ) : null}

          <label className="rf-label" htmlFor="rf-notes">
            Notes <span className="rf-optional">(optional)</span>
          </label>
          <textarea
            id="rf-notes"
            className="rf-input rf-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Dosage, location, anything to remember…"
            rows={2}
          />

          <p className="rf-hint">
            This syncs to your phone. Its notification is scheduled the next time
            the PawProof app opens.
          </p>

          {error ? <p className="rf-error">{error}</p> : null}
        </div>

        <div className="rf-foot">
          <button type="button" className="rf-btn rf-btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="rf-btn rf-btn-primary"
            onClick={submit}
            disabled={submitting || pets.length === 0}
          >
            {submitting ? "Saving…" : "Add reminder"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .rf-backdrop {
          position: fixed;
          inset: 0;
          z-index: 50;
          background: rgba(15, 23, 42, 0.5);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 0;
        }
        @media (min-width: 640px) {
          .rf-backdrop {
            align-items: center;
            padding: 24px;
          }
        }
        .rf-sheet {
          background: #f7f1e3;
          width: 100%;
          max-width: 480px;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          border-radius: 20px 20px 0 0;
          overflow: hidden;
        }
        @media (min-width: 640px) {
          .rf-sheet {
            border-radius: 20px;
          }
        }
        .rf-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          border-bottom: 0.5px solid rgba(60, 60, 67, 0.18);
          background: #fff;
        }
        .rf-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #16252e;
        }
        .rf-close {
          background: transparent;
          border: none;
          color: rgba(60, 60, 67, 0.6);
          cursor: pointer;
          display: inline-flex;
          padding: 4px;
        }
        .rf-body {
          padding: 16px 18px;
          overflow-y: auto;
        }
        .rf-label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: rgba(60, 60, 67, 0.6);
          margin: 16px 2px 8px;
        }
        .rf-label:first-child {
          margin-top: 0;
        }
        .rf-optional {
          text-transform: none;
          letter-spacing: 0;
          font-weight: 600;
          color: rgba(60, 60, 67, 0.4);
        }
        .rf-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .rf-input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(60, 60, 67, 0.16);
          background: #fff;
          font-size: 14px;
          color: #16252e;
          font-family: inherit;
          outline: none;
        }
        .rf-input:focus {
          border-color: #2a8fa8;
        }
        .rf-textarea {
          resize: vertical;
          min-height: 56px;
        }
        .rf-hint {
          margin: 14px 2px 0;
          font-size: 12px;
          line-height: 1.5;
          color: rgba(60, 60, 67, 0.6);
        }
        .rf-error {
          margin: 10px 2px 0;
          font-size: 13px;
          font-weight: 600;
          color: #ba1a1a;
        }
        .rf-note {
          font-size: 14px;
          color: rgba(60, 60, 67, 0.7);
          margin: 0;
        }
        .rf-foot {
          display: flex;
          gap: 10px;
          padding: 14px 18px;
          border-top: 0.5px solid rgba(60, 60, 67, 0.18);
          background: #fff;
        }
        .rf-btn {
          flex: 1;
          padding: 12px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          font-family: inherit;
        }
        .rf-btn:disabled {
          opacity: 0.5;
          cursor: default;
        }
        .rf-btn-ghost {
          background: #efeae0;
          color: #16252e;
        }
        .rf-btn-primary {
          background: #2a8fa8;
          color: #fff;
        }
      `}</style>
    </div>
  );
}
