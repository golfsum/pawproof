"use client";

import { useEffect, useState } from "react";
import {
  Timestamp,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db, isTransientAuthError } from "./firebase";
import { useAuth } from "./auth-context";
import type {
  JournalEntry,
  Pet,
  PetDocument,
  Reminder,
  VaccineRecord,
} from "./types";

// Hook that subscribes to the signed-in user's data in the same shape
// the mobile app uses. One useEffect per collection so unmounts cleanly
// tear down listeners. Mirrors mobile's useData() provider.
//
// Important: Firestore returns Timestamp objects, not strings, for any
// field stored via serverTimestamp() or new Timestamp(). The mobile
// app's `fromDoc` normalizes these to ISO strings before they reach
// the UI; we replicate that here so every consumer (records page,
// dashboard counters, fmtDate calls) sees a consistent string shape.
// Without this, d.getTime() blows up on the {seconds, nanoseconds}
// payload that comes off the wire.
function normalizeDocData(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value instanceof Timestamp) {
      out[key] = value.toDate().toISOString();
    } else if (
      // Duck-type fallback for serialized Timestamp shapes that can
      // slip past the `instanceof` check across SDK versions.
      value &&
      typeof value === "object" &&
      "seconds" in value &&
      "nanoseconds" in value &&
      typeof (value as { seconds: unknown }).seconds === "number"
    ) {
      const ts = value as { seconds: number; nanoseconds: number };
      out[key] = new Date(ts.seconds * 1000 + ts.nanoseconds / 1_000_000).toISOString();
    } else {
      out[key] = value;
    }
  }
  return out;
}

interface UserData {
  pets: Pet[];
  reminders: Reminder[];
  vaccines: VaccineRecord[];
  documents: PetDocument[];
  entries: JournalEntry[];
  loading: boolean;
  /** Set when a non-transient Firestore read fails, so pages can show a
   *  "couldn't load" state instead of a misleading empty state. */
  error: string | null;
}

export function useUserData(): UserData {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [pets, setPets] = useState<Pet[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [vaccines, setVaccines] = useState<VaccineRecord[]>([]);
  const [documents, setDocuments] = useState<PetDocument[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid || !db) {
      setPets([]);
      setReminders([]);
      setVaccines([]);
      setDocuments([]);
      setEntries([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    let received = 0;
    const target = 5;
    const tick = () => {
      received += 1;
      if (received >= target) setLoading(false);
    };

    const watch = <T>(
      coll: string,
      orderField: string,
      direction: "asc" | "desc",
      maxItems: number,
      setter: (items: T[]) => void,
    ) => {
      const q = query(
        collection(db!, "users", uid, coll),
        orderBy(orderField, direction),
        limit(maxItems),
      );
      return onSnapshot(
        q,
        (snap) => {
          setter(
            snap.docs.map((d) => {
              const data = normalizeDocData(d.data() as Record<string, unknown>);
              return { id: d.id, ...data } as unknown as T;
            }),
          );
          tick();
        },
        (err) => {
          if (!isTransientAuthError(err)) {
            console.warn(`[useUserData] ${coll}:`, err);
            setError("We couldn't load your data. Check your connection and refresh.");
          }
          tick();
        },
      );
    };

    const unsubs = [
      watch<Pet>("pets", "createdAt", "asc", 100, setPets),
      watch<Reminder>("reminders", "dueDate", "asc", 200, setReminders),
      watch<VaccineRecord>("vaccines", "dateGiven", "desc", 200, setVaccines),
      watch<PetDocument>("documents", "createdAt", "desc", 200, setDocuments),
      watch<JournalEntry>("journalEntries", "timestamp", "desc", 100, setEntries),
    ];
    return () => unsubs.forEach((u) => u && u());
  }, [uid]);

  return { pets, reminders, vaccines, documents, entries, loading, error };
}
