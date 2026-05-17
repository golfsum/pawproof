import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { PetAvatar } from '@/components/PetAvatar';
import { useAuth } from '@/hooks/AuthProvider';
import { usePet } from '@/hooks/useData';
import { createReminder } from '@/lib/firestore';
import { scheduleReminderForPet } from '@/lib/notifications';
import {
  nextOccurrenceForRoutineItem,
  routinesForPet,
  type Routine,
  type RoutineItem,
} from '@/lib/routines';
import { colors, fonts, radius, spacing, typography } from '@/theme';

// Routine picker for puppies, kittens, and adult pets. Each routine
// is a bundle of recurring reminders the user can apply with one tap.
// We never overwrite existing reminders — applying a routine just
// appends fresh docs, so users can layer routines or run one twice
// without breaking anything.

const REPEAT_LABEL: Record<RoutineItem['repeatType'], string> = {
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
};

export default function RoutinesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ petId: string }>();
  const pet = usePet(String(params.petId ?? ''));
  const { user } = useAuth();
  const [applying, setApplying] = useState<string | null>(null);

  const routines = useMemo(
    () =>
      pet
        ? routinesForPet({
            species: pet.species,
            approxAgeMonths: pet.approxAgeMonths,
            birthday: pet.birthday,
          })
        : [],
    [pet],
  );

  const applyRoutine = (routine: Routine) => {
    if (!user || !pet) return;
    Alert.alert(
      routine.title,
      `Add ${routine.items.length} reminder${routine.items.length === 1 ? '' : 's'} for ${pet.name}? You can edit or remove any of them later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add reminders',
          onPress: async () => {
            setApplying(routine.id);
            try {
              for (const item of routine.items) {
                const when = nextOccurrenceForRoutineItem(item);
                const notifId = await scheduleReminderForPet({
                  pet,
                  reminderType: item.type,
                  reminderTitle: item.title,
                  when,
                });
                await createReminder(user.uid, {
                  petId: pet.id,
                  type: item.type,
                  title: item.title,
                  notes: item.notes,
                  dueDate: when.toISOString(),
                  repeatType: item.repeatType,
                  repeatInterval: null,
                  isCompleted: false,
                  nextDueDate: when.toISOString(),
                  notificationId: notifId,
                });
              }
              Alert.alert(
                'Routine added',
                `${routine.items.length} reminder${routine.items.length === 1 ? '' : 's'} scheduled for ${pet.name}.`,
                [{ text: 'OK', onPress: () => router.back() }],
              );
            } catch (e: any) {
              Alert.alert('Could not add routine', e?.message ?? 'Try again.');
            } finally {
              setApplying(null);
            }
          },
        },
      ],
    );
  };

  if (!pet) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Routines' }} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Pet not found.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Routines' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <PetAvatar pet={pet} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={typography.h2}>Routines for {pet.name}</Text>
            <Text style={styles.sub}>
              Tap a routine to add a set of helpful reminders. Each one runs
              on a friendly default schedule that you can edit anytime.
            </Text>
          </View>
        </View>

        {routines.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="paw-outline" size={28} color={colors.textFaint} />
            <Text style={styles.emptyTitle}>No routines for this species yet</Text>
            <Text style={styles.emptyBody}>
              Routines currently cover dogs and cats. You can still add
              reminders manually from the pet profile.
            </Text>
          </View>
        ) : (
          routines.map(routine => (
            <View key={routine.id} style={styles.routineCard}>
              <View style={styles.routineHeader}>
                <View style={styles.routineIcon}>
                  <Ionicons name="star-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.routineTitle}>{routine.title}</Text>
                  <Text style={styles.routineSummary}>{routine.summary}</Text>
                </View>
              </View>

              <View style={styles.itemsList}>
                {routine.items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.itemText}>
                      <Text style={{ fontFamily: fonts.body.semibold, color: colors.text }}>
                        {item.title}
                      </Text>
                      {' · '}
                      {REPEAT_LABEL[item.repeatType]} at {fmtHour(item.hourOfDay)}
                    </Text>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={() => applyRoutine(routine)}
                disabled={applying !== null}
                style={({ pressed }) => [
                  styles.applyBtn,
                  applying !== null && { opacity: 0.6 },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.applyBtnText}>
                  {applying === routine.id ? 'Adding…' : 'Apply routine'}
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </Pressable>
            </View>
          ))
        )}

        <View style={styles.disclaimerBox}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
          <Text style={styles.disclaimerText}>
            Routines are starting points based on what most trainers
            recommend. Adjust to fit your pet, schedule, and vet's guidance.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function fmtHour(h: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:00 ${period}`;
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['2xl'], gap: spacing.md },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  sub: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginTop: 4 },

  routineCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.md,
  },
  routineHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  routineIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  routineTitle: { fontSize: 15, fontFamily: fonts.display.bold, color: colors.text },
  routineSummary: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: 2 },

  itemsList: {
    gap: 6,
    padding: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },

  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  applyBtnText: { fontSize: 13, fontFamily: fonts.body.semibold, color: '#fff' },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 14, fontFamily: fonts.body.semibold, color: colors.text },
  emptyBody: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 17 },

  disclaimerBox: {
    flexDirection: 'row',
    gap: 6,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: colors.textMuted, lineHeight: 16 },

  empty: { padding: spacing.lg, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
