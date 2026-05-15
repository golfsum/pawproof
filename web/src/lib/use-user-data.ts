"use client";

import { useEffect, useState } from "react";
import {
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

interface UserData {
  pets: Pet[];
  reminders: Reminder[];
  vaccines: VaccineRecord[];
  documents: PetDocument[];
  entries: JournalEntry[];
  loading: boolean;
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

  useEffect(() => {
    if (!uid || !db) {
      setPets([]);
      setReminders([]);
      setVaccines([]);
      setDocuments([]);
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
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
              const data = d.data() as Record<string, unknown>;
              return { id: d.id, ...data } as unknown as T;
            }),
          );
          tick();
        },
        (err) => {
          if (!isTransientAuthError(err)) {
            console.warn(`[useUserData] ${coll}:`, err);
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

  return { pets, reminders, vaccines, documents, entries, loading };
}
