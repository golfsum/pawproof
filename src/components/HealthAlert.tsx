import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, fonts } from '@/theme';

/**
 * Coral-bordered "Health Alert" banner. Visual cue for overdue vaccines /
 * meds / vet visits on a pet profile or Records view. Stays visually heavier
 * than a regular reminder card so it commands attention but doesn't shout.
 */
interface Props {
  /** Total number of overdue items powering the count badge. */
  overdueCount: number;
  /** Optional body text overriding the default summary. */
  body?: string;
  onPress?: () => void;
}

export function HealthAlert({ overdueCount, body, onPress }: Props) {
  if (overdueCount <= 0) return null;

  const defaultBody = overdueCount === 1
    ? 'One item is past its due date.'
    : `${overdueCount} items are past their due dates.`;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.container, pressed && onPress && { opacity: 0.92 }]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="alert-circle" size={20} color="#fff" />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Health Alert</Text>
          <View style={styles.countPill}>
            <Text style={styles.countText}>
              {overdueCount} {overdueCount === 1 ? 'overdue' : 'overdue'}
            </Text>
          </View>
        </View>
        <Text style={styles.bodyText}>
          {body ?? defaultBody}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.dangerSoft + '7A', // soft coral wash
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.base,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: {
    fontFamily: fonts.display.semibold,
    fontSize: 15,
    color: '#7A2920',
  },
  countPill: {
    backgroundColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  countText: {
    fontFamily: fonts.body.semibold,
    fontSize: 10,
    color: '#fff',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bodyText: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
