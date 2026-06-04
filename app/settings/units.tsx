import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/hooks/AuthProvider';
import { setDistanceUnit, setDateFormat } from '@/lib/firestore';
import {
  resolveDistanceUnit, resolveDateFormat,
  type DistanceUnit, type DateFormatPref,
} from '@/utils/units';
import { colors, fonts, radius, spacing, typography } from '@/theme';

// Settings → Units. Right now we only expose distance (mi vs km).
// Weight has its own pref in a couple of places already and isn't
// wired through a single switch yet; we'll fold it in once those
// callsites get consolidated.

const DISTANCE_OPTIONS: Array<{ value: DistanceUnit; label: string; description: string }> = [
  { value: 'mi', label: 'Miles', description: 'Used in the US and UK informally. Distances show as "2.0 mi".' },
  { value: 'km', label: 'Kilometers', description: 'Used in most of the world. Distances show as "3.2 km".' },
];

const DATE_OPTIONS: Array<{ value: DateFormatPref; label: string; description: string }> = [
  { value: 'mdy', label: 'Month first (US)', description: 'Dates show as "Jun 4, 2026".' },
  { value: 'dmy', label: 'Day first (European)', description: 'Dates show as "4 Jun 2026".' },
];

export default function UnitsScreen() {
  const { user, profile } = useAuth();
  const initial = resolveDistanceUnit(profile?.distanceUnit);
  const [unit, setUnit] = useState<DistanceUnit>(initial);
  const [dateFmt, setDateFmt] = useState<DateFormatPref>(resolveDateFormat(profile?.dateFormat));
  const [saving, setSaving] = useState(false);

  const handlePick = async (next: DistanceUnit) => {
    if (!user || next === unit) return;
    setUnit(next);
    setSaving(true);
    try {
      await setDistanceUnit(user.uid, next);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Try again.');
      setUnit(unit);
    } finally {
      setSaving(false);
    }
  };

  const handleDatePick = async (next: DateFormatPref) => {
    if (!user || next === dateFmt) return;
    const prev = dateFmt;
    setDateFmt(next);
    setSaving(true);
    try {
      await setDateFormat(user.uid, next);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Try again.');
      setDateFmt(prev);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Units' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={typography.h1}>Units</Text>
        <Text style={styles.intro}>
          How PawProof shows distance in walks, weekly summaries, and shared
          PDFs. Stored values aren't affected. Toggle anytime.
        </Text>

        <Text style={styles.sectionLabel}>Distance</Text>
        <View style={styles.card}>
          {DISTANCE_OPTIONS.map((opt, idx) => {
            const selected = unit === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => handlePick(opt.value)}
                disabled={saving}
                style={({ pressed }) => [
                  styles.row,
                  idx > 0 && styles.divider,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <View style={[styles.radioOuter, selected && { borderColor: colors.primary }]}>
                  {selected ? <View style={styles.radioInner} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{opt.label}</Text>
                  <Text style={styles.body}>{opt.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Date format</Text>
        <View style={styles.card}>
          {DATE_OPTIONS.map((opt, idx) => {
            const selected = dateFmt === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => handleDatePick(opt.value)}
                disabled={saving}
                style={({ pressed }) => [
                  styles.row,
                  idx > 0 && styles.divider,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <View style={[styles.radioOuter, selected && { borderColor: colors.primary }]}>
                  {selected ? <View style={styles.radioInner} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{opt.label}</Text>
                  <Text style={styles.body}>{opt.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['2xl'], gap: spacing.sm },
  intro: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginTop: 4, marginBottom: spacing.md },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.body.semibold,
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  label: { fontSize: 14, fontFamily: fonts.body.semibold, color: colors.text },
  body: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
});
