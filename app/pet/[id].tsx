import React, { useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { Screen } from '@/components/Screen';
import { Chip } from '@/components/Chip';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ReminderCard } from '@/components/ReminderCard';
import { TimelineRow } from '@/components/TimelineRow';
import { QuickLogSheet, QuickLogKind } from '@/components/QuickLogSheet';
import { useAuth } from '@/hooks/AuthProvider';
import {
  useData,
  usePet,
  useEntriesForPet,
  useRemindersForPet,
  useVaccinesForPet,
  useDocumentsForPet,
  useMedicationsForPet,
} from '@/hooks/useData';
import { useGate } from '@/hooks/useGate';
import { colors, radius, spacing, typography } from '@/theme';
import { fmtDate, fmtPetAge, daysUntil } from '@/utils/dates';
import { fmtWeight, resolveDistanceUnit, type DistanceUnit } from '@/utils/units';
import { getReminderName } from '@/utils/reminderCategory';
import { findGroupForReminder } from '@/utils/reminderGroups';
import { markReminderDone } from '@/lib/reminderActions';
import { SPECIES_LABEL, JOURNAL_META } from '@/utils/petIcon';
import { deletePet, deleteEntry, deleteVaccine, updateReminder } from '@/lib/firestore';
import { sharePetHealthPdf, shareSitterPdf } from '@/lib/pdf';
import type { Reminder, JournalEntry, Medication, Pet, VaccineRecord } from '@/types/models';
import { generateInsights, type Insight } from '@/utils/insights';
import { canonicalizeVaccineName } from '@/utils/vaccineNames';
import { HealthAlert } from '@/components/HealthAlert';

type Tab = 'timeline' | 'care' | 'records' | 'info';

export default function PetProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { pets, reminders: allReminders } = useData();
  const pet = usePet(id);
  const entries = useEntriesForPet(id);
  const reminders = useRemindersForPet(id);
  const vaccines = useVaccinesForPet(id);
  const documents = useDocumentsForPet(id);
  const medications = useMedicationsForPet(id);
  const { check } = useGate();

  const [tab, setTab] = useState<Tab>('timeline');
  // Count of overdue (not-completed) reminders. Powers the HealthAlert
  // banner shown below the hero.
  const overdueCount = reminders.filter(
    r => !r.isCompleted && new Date(r.dueDate).getTime() < Date.now(),
  ).length;
  const [quickLogKind, setQuickLogKind] = useState<QuickLogKind | null>(null);

  // Open a system action sheet (or Android Alert) that lists every quick log
  // option, then opens the QuickLogSheet for the chosen kind.
  const pickLogKind = () => {
    const options: { label: string; kind: QuickLogKind }[] = [
      { label: 'Fed', kind: 'fed' },
      { label: 'Walk', kind: 'walk' },
      { label: 'Meds', kind: 'medication' },
      { label: 'Training', kind: 'training' },
      { label: 'Symptom', kind: 'symptom' },
      { label: 'Grooming', kind: 'grooming' },
    ];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: `Log care for ${pet.name}`,
          options: [...options.map(o => o.label), 'Cancel'],
          cancelButtonIndex: options.length,
        },
        idx => {
          if (idx >= 0 && idx < options.length) setQuickLogKind(options[idx].kind);
        },
      );
    } else {
      Alert.alert(`Log care for ${pet.name}`, undefined, [
        ...options.map(o => ({ text: o.label, onPress: () => setQuickLogKind(o.kind) })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  if (!pet) {
    return (
      <Screen padded>
        <Stack.Screen options={{ title: 'Pet' }} />
        <Text style={[typography.body, { color: colors.textMuted }]}>This pet isn't available.</Text>
      </Screen>
    );
  }

  const handleDelete = () => {
    Alert.alert('Delete pet?', `This removes ${pet.name} and disconnects related reminders. Records remain in your data.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!profile) return;
          await deletePet(profile.id, pet.id);
          router.back();
        },
      },
    ]);
  };

  const exportHealthPdf = async () => {
    if (!check('pdf_export')) return;
    try {
      await sharePetHealthPdf({
        pet,
        profile,
        vaccines,
        recentEntries: entries.slice(0, 20),
        medications: entries.filter(e => e.type === 'medication'),
      });
    } catch (e: any) {
      Alert.alert('Could not generate PDF', e?.message ?? 'Try again.');
    }
  };

  const exportSitterPdf = async () => {
    if (!check('pdf_export')) return;
    try {
      await shareSitterPdf({
        pet,
        profile,
        medications: medications.filter(m => m.isActive),
        recentEntries: entries.slice(0, 30),
      });
    } catch (e: any) {
      Alert.alert('Could not generate PDF', e?.message ?? 'Try again.');
    }
  };

  // Share menu: vet-ready health summary OR pet-sitter routine guide.
  const handleExport = () => {
    const options = ['Vet health summary', 'Pet sitter guide', 'Cancel'];
    const cancelIndex = options.length - 1;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: `Share ${pet.name}'s profile`, options, cancelButtonIndex: cancelIndex },
        idx => {
          if (idx === 0) exportHealthPdf();
          else if (idx === 1) exportSitterPdf();
        },
      );
    } else {
      Alert.alert(`Share ${pet.name}'s profile`, undefined, [
        { text: 'Vet health summary', onPress: exportHealthPdf },
        { text: 'Pet sitter guide', onPress: exportSitterPdf },
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  return (
    <Screen edges={['top']}>
      <Stack.Screen options={{ title: pet.name, headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing['3xl'] }}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => router.push({ pathname: '/pet/summary/[id]', params: { id: pet.id } })}
            hitSlop={10}
            style={styles.iconBtn}
          >
            <Ionicons name="stats-chart-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/pet/share/[id]', params: { id: pet.id } })}
            hitSlop={10}
            style={styles.iconBtn}
          >
            <Ionicons name="people-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable onPress={handleExport} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="share-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/pet/edit/[id]', params: { id: pet.id } })}
            hitSlop={10}
            style={styles.iconBtn}
          >
            <Ionicons name="create-outline" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.heroWrap}>
          {pet.photoUrl ? (
            <Image source={{ uri: pet.photoUrl }} style={styles.hero} contentFit="cover" transition={140} />
          ) : (
            <View style={[styles.hero, styles.heroEmpty]}>
              <Text style={{ fontSize: 64 }}>🐾</Text>
            </View>
          )}
          <Text style={styles.name}>{pet.name}</Text>
          <Text style={styles.sub}>
            {SPECIES_LABEL[pet.species]}
            {pet.breed ? ` · ${pet.breed}` : ''}
            {fmtPetAge(pet.birthday, pet.approxAgeMonths) ? ` · ${fmtPetAge(pet.birthday, pet.approxAgeMonths)}` : ''}
          </Text>

          <View style={styles.actions}>
            <ActionBtn icon="add-circle-outline" label="Log Care" onPress={pickLogKind} />
            <ActionBtn icon="alarm-outline" label="Reminder" onPress={() => router.push({ pathname: '/reminder/add', params: { petId: pet.id } })} />
            <ActionBtn icon="shield-checkmark-outline" label="Vaccine" onPress={() => router.push({ pathname: '/vaccine/add', params: { petId: pet.id } })} />
            <ActionBtn icon="document-attach-outline" label="Document" onPress={() => check('upload_document') && router.push({ pathname: '/document/upload', params: { petId: pet.id } })} />
          </View>
        </View>

        {overdueCount > 0 ? (
          <View style={styles.healthAlertWrap}>
            <HealthAlert
              overdueCount={overdueCount}
              body={`${pet.name} has ${overdueCount} ${overdueCount === 1 ? 'item' : 'items'} past their due dates. Tap to review.`}
              onPress={() => setTab('care')}
            />
          </View>
        ) : null}

        <View style={styles.tabBar}>
          {(['timeline', 'care', 'records', 'info'] as Tab[]).map(t => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                {t === 'timeline' ? 'Timeline' : t === 'care' ? 'Care' : t === 'records' ? 'Records' : 'Info'}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'timeline' && (
          <TimelineTab entries={entries} pet={pet} distanceUnit={resolveDistanceUnit(profile?.distanceUnit)} onAdd={pickLogKind} onDeleteEntry={async (id) => {
            if (!profile) return;
            await deleteEntry(profile.id, id);
          }} />
        )}

        {tab === 'care' && (
          <CareTab
            reminders={reminders}
            medications={medications}
            vaccines={vaccines}
            petId={pet.id}
            pet={pet}
            entries={entries}
            onMarkDone={(r) => {
              if (!profile) return;
              const name = getReminderName(r);
              const isRecurring = r.repeatType !== 'none';
              // Group-aware label: a multi-pet reminder reads as "for
              // Yahzi, Moqui, and Lovie" so the user knows tapping
              // mark-done completes every pet at once. Pet profile
              // can't reach other pets' reminder docs directly; the
              // `allReminders` list from useData lets the helper find
              // them.
              const group = findGroupForReminder(r, allReminders);
              const groupPets = group.petIds
                .map(pid => pets.find(p => p.id === pid))
                .filter((p): p is NonNullable<typeof p> => !!p);
              const forPhrase = group.isGrouped
                ? (() => {
                    if (groupPets.length === 2) return ` for ${groupPets[0].name} and ${groupPets[1].name}`;
                    return ` for ${groupPets.slice(0, -1).map(p => p.name).join(', ')}, and ${groupPets[groupPets.length - 1].name}`;
                  })()
                : ` for ${pet.name}`;
              Alert.alert(
                'Mark done?',
                isRecurring
                  ? `Complete "${name}"${forPhrase}. Next due date will be scheduled.`
                  : `Complete "${name}"${forPhrase}. This reminder will be marked complete.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: isRecurring ? 'Mark done' : 'Complete',
                    onPress: () =>
                      markReminderDone({
                        uid: profile.id,
                        reminder: r,
                        allReminders,
                        allPets: pets,
                        actorName: profile.displayName ?? null,
                      }),
                  },
                ],
              );
            }}
            onAddReminder={() => router.push({ pathname: '/reminder/add', params: { petId: pet.id } })}
            onAddMedication={() => router.push({ pathname: '/medication/add', params: { petId: pet.id } })}
            onOpenMedication={(medId) => router.push({ pathname: '/medication/[id]', params: { id: medId } })}
            onAddRoutine={() => router.push({ pathname: '/routines/[petId]', params: { petId: pet.id } })}
          />
        )}

        {tab === 'records' && (
          <RecordsTab
            vaccines={vaccines}
            documents={documents}
            entries={entries}
            onAddVaccine={() => router.push({ pathname: '/vaccine/add', params: { petId: pet.id } })}
            // Uploads live in the Records tab so there's a single canonical
            // entry point; this chip just routes the user there.
            onSmartScan={() => router.push('/(tabs)/records')}
            onDeleteVaccine={(id, name) => {
              if (!profile) return;
              Alert.alert('Delete vaccine?', `Remove ${name} from records.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteVaccine(profile.id, id) },
              ]);
            }}
          />
        )}

        {tab === 'info' && (
          <InfoTab pet={pet} onDelete={handleDelete} />
        )}
      </ScrollView>

      <QuickLogSheet
        visible={quickLogKind !== null}
        kind={quickLogKind}
        initialPetId={pet.id}
        onClose={() => setQuickLogKind(null)}
      />
    </Screen>
  );
}


function ActionBtn({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.85 }]}>
      <View style={styles.actionIcon}><Ionicons name={icon} size={20} color={colors.primary} /></View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const FREQUENCY_SHORT: Record<Medication['frequency'], string> = {
  once_daily: '1x / day',
  twice_daily: '2x / day',
  three_times_daily: '3x / day',
  every_other_day: 'Every 2 days',
  weekly: 'Weekly',
  monthly: 'Monthly',
  as_needed: 'As needed',
};

const INSIGHT_TONE = {
  info:    { bg: colors.primarySoft,  fg: colors.primaryDark, iconBg: '#cfe9ef' },
  warning: { bg: colors.warningSoft,  fg: '#92400e',           iconBg: '#fde68a' },
  danger:  { bg: colors.dangerSoft,   fg: '#991b1b',           iconBg: '#fbd5d5' },
  success: { bg: colors.successSoft,  fg: '#1E6C80',           iconBg: '#A8D5E1' },
};

function InsightCard({ insight }: { insight: Insight }) {
  const tone = INSIGHT_TONE[insight.tone];
  return (
    <View style={[styles.insightCard, { backgroundColor: tone.bg }]}>
      <View style={[styles.insightIcon, { backgroundColor: tone.iconBg }]}>
        <Ionicons name={insight.icon as any} size={16} color={tone.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.insightTitle, { color: tone.fg }]}>{insight.title}</Text>
        <Text style={[styles.insightBody, { color: tone.fg }]}>{insight.body}</Text>
      </View>
    </View>
  );
}

function MedicationRow({ medication, onPress }: { medication: Medication; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.medRow, pressed && { opacity: 0.9 }]}>
      <View style={styles.medIcon}>
        <Ionicons name="medkit-outline" size={18} color={colors.danger} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.medTitle}>{medication.name}</Text>
        <Text style={styles.medSub}>
          {FREQUENCY_SHORT[medication.frequency]}
          {medication.dosage ? ` · ${medication.dosage}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

function TimelineTab({ entries, pet, distanceUnit, onAdd, onDeleteEntry }: {
  entries: JournalEntry[];
  pet: ReturnType<typeof usePet>;
  distanceUnit: DistanceUnit;
  onAdd: () => void;
  onDeleteEntry: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const byDay: Record<string, JournalEntry[]> = {};
    for (const e of entries) {
      const key = format(new Date(e.timestamp), 'EEEE, MMM d');
      (byDay[key] ||= []).push(e);
    }
    return Object.entries(byDay);
  }, [entries]);

  if (entries.length === 0) {
    return (
      <View style={{ padding: spacing.xl, alignItems: 'center' }}>
        <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md }]}>
          No entries yet. Use Quick Log to capture meals, walks, meds, and more.
        </Text>
        <PrimaryButton title="Quick Log" icon="add" onPress={onAdd} />
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.lg }}>
      {grouped.map(([day, items]) => (
        <View key={day}>
          <Text style={styles.dayHeader}>{day}</Text>
          <View style={styles.timelineCard}>
            {items.map((e, idx) => (
              <View key={e.id} style={idx > 0 && styles.divider}>
                <Pressable
                  onLongPress={() =>
                    Alert.alert('Delete entry?', e.title, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => onDeleteEntry(e.id) },
                    ])
                  }
                >
                  <TimelineRow entry={e} pet={pet} distanceUnit={distanceUnit} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function CareTab({ reminders, medications, vaccines, petId, pet, entries, onMarkDone, onAddReminder, onAddMedication, onOpenMedication, onAddRoutine }: {
  reminders: Reminder[];
  medications: Medication[];
  vaccines: VaccineRecord[];
  petId: string;
  pet: Pet;
  entries: JournalEntry[];
  onMarkDone: (r: Reminder) => void;
  onAddReminder: () => void;
  onAddMedication: () => void;
  onOpenMedication: (medId: string) => void;
  onAddRoutine: () => void;
}) {
  const active = reminders.filter(r => !r.isCompleted).sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
  const others = active.filter(r => r.type !== 'medication');
  const activeMeds = medications.filter(m => m.isActive);
  const insights = generateInsights(pet, entries, vaccines, reminders);

  return (
    <View style={{ gap: spacing.lg, paddingHorizontal: spacing.base }}>
      {insights.length > 0 ? (
        <View>
          <Text style={styles.dayHeader}>Insights</Text>
          <View style={{ gap: spacing.sm }}>
            {insights.map(i => <InsightCard key={i.id} insight={i} />)}
          </View>
        </View>
      ) : null}

      <View>
        <Text style={styles.dayHeader}>Upcoming reminders</Text>
        {others.length === 0 ? (
          <Text style={styles.muted}>No upcoming reminders.</Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {others.map(r => (
              <ReminderCard key={r.id} reminder={r} onMarkDone={() => onMarkDone(r)} />
            ))}
          </View>
        )}
      </View>

      <View>
        <View style={styles.medsHeaderRow}>
          <Text style={styles.dayHeader}>Medications</Text>
          <Pressable onPress={onAddMedication} hitSlop={8}>
            <Text style={styles.addLink}>+ Add</Text>
          </Pressable>
        </View>
        {activeMeds.length === 0 ? (
          <Text style={styles.muted}>No active medications. Add one to track dosage + missed doses.</Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {activeMeds.map(m => (
              <MedicationRow key={m.id} medication={m} onPress={() => onOpenMedication(m.id)} />
            ))}
          </View>
        )}
      </View>

      <PrimaryButton title="Add reminder" icon="add" variant="secondary" onPress={onAddReminder} />
      <PrimaryButton
        title="Add a routine"
        icon="star-outline"
        variant="ghost"
        onPress={onAddRoutine}
      />
    </View>
  );
}

function RecordsTab({
  vaccines, documents, entries, onAddVaccine, onSmartScan, onDeleteVaccine,
}: {
  vaccines: any[]; documents: any[]; entries: JournalEntry[];
  onAddVaccine: () => void; onSmartScan: () => void;
  onDeleteVaccine?: (id: string, name: string) => void;
}) {
  const router = useRouter();
  const vetVisits = entries.filter(e => e.type === 'vet_visit');
  const meds = entries.filter(e => e.type === 'medication');

  return (
    <View style={{ gap: spacing.lg, paddingHorizontal: spacing.base }}>
      <View style={styles.recordRow}>
        <Chip label="Scan Document" icon="scan-outline" tone="primary" onPress={onSmartScan} />
        <Chip label="Add vaccine" icon="shield-checkmark-outline" tone="success" onPress={onAddVaccine} />
      </View>

      <View>
        <Text style={styles.dayHeader}>Vaccinations</Text>
        {vaccines.length === 0 ? (
          <Text style={styles.muted}>No vaccinations on file.</Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {vaccines.map(v => {
              const days = v.expirationDate ? daysUntil(v.expirationDate) : null;
              let tone: 'success' | 'warning' | 'danger' = 'success';
              let badgeText = '';
              if (days != null) {
                if (days < 0) { tone = 'danger'; badgeText = 'Expired'; }
                else if (days <= 30) { tone = 'warning'; badgeText = `${days}d`; }
                else { tone = 'success'; badgeText = `${days}d`; }
              }
              return (
                <Pressable
                  key={v.id}
                  onPress={() => router.push({ pathname: '/vaccine/edit/[id]', params: { id: v.id } })}
                  onLongPress={onDeleteVaccine ? () => onDeleteVaccine(v.id, canonicalizeVaccineName(v.vaccineName)) : undefined}
                  style={({ pressed }) => [styles.recordCard, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.recordTitle}>{canonicalizeVaccineName(v.vaccineName)}</Text>
                  <Text style={styles.recordSub}>
                    Given {fmtDate(v.dateGiven)}
                    {v.expirationDate ? ` · Expires ${fmtDate(v.expirationDate)}` : ''}
                    {v.clinicName ? ` · ${v.clinicName}` : ''}
                  </Text>
                  {badgeText ? <Chip label={badgeText} tone={tone} small style={{ alignSelf: 'flex-start', marginTop: 6 }} /> : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View>
        <Text style={styles.dayHeader}>Documents</Text>
        {documents.length === 0 ? (
          <Text style={styles.muted}>No documents uploaded.</Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {documents.map((d: any) => (
              <Pressable
                key={d.id}
                onPress={() => router.push({ pathname: '/document/[id]', params: { id: d.id } })}
                style={({ pressed }) => [styles.recordCard, styles.recordCardRow, pressed && { opacity: 0.9 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordTitle}>{d.title}</Text>
                  <Text style={styles.recordSub}>{fmtDate(d.createdAt)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View>
        <Text style={styles.dayHeader}>Vet visits</Text>
        {vetVisits.length === 0 ? (
          <Text style={styles.muted}>No vet visits logged.</Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {vetVisits.map(e => (
              <View key={e.id} style={styles.recordCard}>
                <Text style={styles.recordTitle}>{e.title}</Text>
                <Text style={styles.recordSub}>{fmtDate(e.timestamp)}{e.note ? ` · ${e.note}` : ''}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View>
        <Text style={styles.dayHeader}>Medications</Text>
        {meds.length === 0 ? (
          <Text style={styles.muted}>No medications logged.</Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {meds.map(e => (
              <View key={e.id} style={styles.recordCard}>
                <Text style={styles.recordTitle}>{e.title}{e.amount ? ` · ${e.amount}` : ''}</Text>
                <Text style={styles.recordSub}>{fmtDate(e.timestamp)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function InfoTab({ pet, onDelete }: { pet: any; onDelete: () => void }) {
  const router = useRouter();
  const ageText = fmtPetAge(pet.birthday, pet.approxAgeMonths);
  const goEdit = () => router.push({ pathname: '/pet/edit/[id]', params: { id: pet.id } });

  // Each row has either a custom action (tel/url link) OR falls back to opening
  // the Edit Pet form. Type `link: true` indicates the value should render as a
  // tappable link tint instead of the standard text color.
  const rows: { label: string; value?: string | null; onPress?: () => void; link?: boolean }[] = [
    { label: 'Species', value: SPECIES_LABEL[pet.species as keyof typeof SPECIES_LABEL] },
    { label: 'Breed', value: pet.breed },
    { label: 'Birthday', value: pet.birthday ? fmtDate(pet.birthday) : null },
    { label: 'Age', value: ageText || null },
    { label: 'Weight', value: fmtWeight(pet.weightKg) },
    { label: 'Microchip', value: pet.microchip },
    { label: 'Vet', value: pet.vetName },
    {
      label: 'Vet phone',
      value: pet.vetPhone,
      onPress: pet.vetPhone ? () => Linking.openURL(`tel:${pet.vetPhone.replace(/[^\d+]/g, '')}`) : undefined,
      link: !!pet.vetPhone,
    },
    {
      label: 'Vet website',
      value: pet.vetWebsite,
      onPress: pet.vetWebsite ? () => Linking.openURL(normalizeUrl(pet.vetWebsite)) : undefined,
      link: !!pet.vetWebsite,
    },
    { label: 'Allergies', value: pet.allergies },
    { label: 'Insurance', value: pet.insurance },
  ];

  return (
    <View style={{ paddingHorizontal: spacing.base, gap: spacing.md }}>
      <Text style={styles.infoHint}>Tap any field to edit</Text>
      <View style={styles.recordCard}>
        {rows.map((r, idx) => (
          <Pressable
            key={r.label}
            onPress={r.onPress ?? goEdit}
            style={({ pressed }) => [
              styles.infoRow,
              idx > 0 && styles.divider,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.infoLabel}>{r.label}</Text>
            <View style={styles.infoValueWrap}>
              <Text style={[
                styles.infoValue,
                !r.value && { color: colors.textFaint },
                r.link && r.value && { color: colors.primary, fontWeight: '600' },
              ]} numberOfLines={1}>
                {r.value || 'Tap to add'}
              </Text>
              {!r.link ? (
                <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>

      <CareInstructionsCard pet={pet} />

      <Pressable onPress={goEdit} style={({ pressed }) => [styles.recordCard, pressed && { opacity: 0.9 }]}>
        <Text style={styles.infoLabel}>Notes</Text>
        <Text style={[styles.infoValue, { marginTop: 4, color: pet.notes ? colors.text : colors.textFaint }]}>
          {pet.notes || 'Tap to add'}
        </Text>
      </Pressable>

      <Pressable
        onPress={goEdit}
        style={({ pressed }) => [styles.recordCard, { backgroundColor: colors.dangerSoft }, pressed && { opacity: 0.9 }]}
      >
        <Text style={[styles.infoLabel, { color: '#991b1b' }]}>Emergency notes</Text>
        <Text style={[styles.infoValue, { marginTop: 4, color: pet.emergencyNotes ? '#7f1d1d' : '#b91c1c99' }]}>
          {pet.emergencyNotes || 'Tap to add'}
        </Text>
      </Pressable>

      <PrimaryButton title={`Delete ${pet.name}`} variant="danger" icon="trash-outline" onPress={onDelete} />
    </View>
  );
}

// Summary card for the Care Instructions screen. Shows a quick count
// of how many fields are filled in plus a teaser line. Tapping opens
// the dedicated editor at /pet/care/[id].
function CareInstructionsCard({ pet }: { pet: any }) {
  const router = useRouter();
  const fields = [
    pet.feedingInstructions,
    pet.walkRoutine,
    pet.behaviorNotes,
    pet.boardingInstructions,
    pet.favoriteThings,
    pet.allergies,
  ];
  const filled = fields.filter(Boolean).length;
  const teaser =
    pet.feedingInstructions ||
    pet.walkRoutine ||
    pet.behaviorNotes ||
    pet.boardingInstructions ||
    null;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/pet/care/[id]', params: { id: pet.id } })}
      style={({ pressed }) => [styles.recordCard, pressed && { opacity: 0.9 }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{
          width: 32, height: 32, borderRadius: 10,
          backgroundColor: colors.primarySoft,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name="reader-outline" size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.infoLabel}>Care instructions</Text>
          <Text style={[styles.infoValue, { marginTop: 2, color: filled > 0 ? colors.text : colors.textFaint }]} numberOfLines={2}>
            {filled === 0
              ? 'Tap to add feeding, walks, behavior, allergies, and sitter notes'
              : teaser ?? `${filled} of 6 sections filled`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      </View>
    </Pressable>
  );
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    alignItems: 'center',
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 2,
  },
  heroWrap: { alignItems: 'center', paddingHorizontal: spacing.base, paddingBottom: spacing.md, gap: 6 },
  hero: { width: 140, height: 140, borderRadius: 70, backgroundColor: colors.primarySoft },
  heroEmpty: { alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 26, fontWeight: '700', color: colors.text, marginTop: 8 },
  sub: { fontSize: 14, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { alignItems: 'center', gap: 6, minWidth: 70 },
  actionIcon: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 12, fontWeight: '600', color: colors.text },
  healthAlertWrap: { paddingHorizontal: spacing.base, marginBottom: spacing.md },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardSubtle,
    marginHorizontal: spacing.base,
    borderRadius: radius.pill,
    padding: 4,
    marginVertical: spacing.lg,
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.bgElevated },
  tabLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabLabelActive: { color: colors.text },
  dayHeader: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  timelineCard: {
    marginHorizontal: spacing.base,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  muted: { paddingHorizontal: spacing.base, color: colors.textMuted, fontSize: 14 },
  recordRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  recordCard: { backgroundColor: colors.card, padding: spacing.md, borderRadius: radius.lg },
  recordCardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  insightCard: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, alignItems: 'flex-start' },
  insightIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  insightTitle: { fontSize: 14, fontWeight: '700' },
  insightBody: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  medsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: spacing.base, marginBottom: spacing.sm },
  addLink: { fontSize: 14, fontWeight: '600', color: colors.primary },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  medIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  medTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  medSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  recordTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  recordSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, alignItems: 'center' },
  infoLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  infoValue: { fontSize: 14, color: colors.text, flexShrink: 1, textAlign: 'right' },
  infoValueWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  infoHint: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.5,
    color: colors.textFaint, textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
});
