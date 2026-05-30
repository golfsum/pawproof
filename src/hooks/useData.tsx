import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  watchPets,
  watchEntries,
  watchReminders,
  watchVaccines,
  watchDocuments,
  watchMedications,
  watchSharesReceived,
} from '@/lib/firestore';
import { useAuth } from './AuthProvider';
import type {
  Pet,
  JournalEntry,
  Reminder,
  VaccineRecord,
  PetDocument,
  Medication,
  PetShare,
} from '@/types/models';
import { entryCoversPet } from '@/types/models';

interface DataContextValue {
  pets: Pet[];
  entries: JournalEntry[];
  reminders: Reminder[];
  vaccines: VaccineRecord[];
  documents: PetDocument[];
  medications: Medication[];
  // Pets shared WITH this user (they're a caregiver / view-only).
  // The full pet docs live under the owner's /users/{ownerUid}/pets
  // subtree. Reading them from this side requires a Firestore rule
  // update; until then this surfaces invite metadata only.
  receivedShares: PetShare[];
  loading: boolean;
  /** Set when one or more Firestore listeners fail (permission/network).
   *  Lets screens distinguish "load failed" from "genuinely empty". */
  error: Error | null;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [vaccines, setVaccines] = useState<VaccineRecord[]>([]);
  const [documents, setDocuments] = useState<PetDocument[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [receivedShares, setReceivedShares] = useState<PetShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setPets([]);
      setEntries([]);
      setReminders([]);
      setVaccines([]);
      setDocuments([]);
      setMedications([]);
      setReceivedShares([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    let received = 0;
    const target = 6;
    const tick = () => {
      received += 1;
      if (received >= target) setLoading(false);
    };
    // On a listener error we STILL tick() so `loading` resolves (otherwise a
    // single failed collection would hang the spinner forever), and we record
    // the error so consumers can show a retry state instead of a false-empty.
    const onErr = (e: Error) => { setError(e); tick(); };
    const unsubs = [
      watchPets(user.uid, p => { setPets(p); tick(); }, onErr),
      watchEntries(user.uid, e => { setEntries(e); tick(); }, onErr),
      watchReminders(user.uid, r => { setReminders(r); tick(); }, onErr),
      watchVaccines(user.uid, v => { setVaccines(v); tick(); }, onErr),
      watchDocuments(user.uid, d => { setDocuments(d); tick(); }, onErr),
      watchMedications(user.uid, m => { setMedications(m); tick(); }, onErr),
      // Doesn't count toward the loading target — shares are
      // supplementary and shouldn't block the initial render.
      watchSharesReceived(user.uid, setReceivedShares),
    ];
    return () => unsubs.forEach(u => u && u());
  }, [user?.uid]);

  const value = useMemo<DataContextValue>(
    () => ({ pets, entries, reminders, vaccines, documents, medications, receivedShares, loading, error }),
    [pets, entries, reminders, vaccines, documents, medications, receivedShares, loading, error],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}

export function usePet(petId: string | undefined): Pet | undefined {
  const { pets } = useData();
  return useMemo(() => pets.find(p => p.id === petId), [pets, petId]);
}

export function useEntriesForPet(petId: string): JournalEntry[] {
  const { entries } = useData();
  return useMemo(() => entries.filter(e => entryCoversPet(e, petId)), [entries, petId]);
}

export function useRemindersForPet(petId: string): Reminder[] {
  const { reminders } = useData();
  return useMemo(() => reminders.filter(r => r.petId === petId), [reminders, petId]);
}

export function useVaccinesForPet(petId: string): VaccineRecord[] {
  const { vaccines } = useData();
  return useMemo(() => vaccines.filter(v => v.petId === petId), [vaccines, petId]);
}

export function useDocumentsForPet(petId: string): PetDocument[] {
  const { documents } = useData();
  return useMemo(() => documents.filter(d => d.petId === petId), [documents, petId]);
}

export function useMedicationsForPet(petId: string): Medication[] {
  const { medications } = useData();
  return useMemo(() => medications.filter(m => m.petId === petId), [medications, petId]);
}
