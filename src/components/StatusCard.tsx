import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';

interface Props {
  label: string;
  count: number;
  tone: 'danger' | 'warning' | 'primary' | 'success';
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

export function StatusCard({ label, count, tone, icon, onPress }: Props) {
  const t = TONES[tone];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: t.bg }, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: t.iconBg }]}>
        <Ionicons name={icon} size={18} color={t.fg} />
      </View>
      <Text style={[styles.count, { color: t.fg }]}>{count}</Text>
      <Text style={[styles.label, { color: t.fg }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const TONES = {
  danger: { bg: colors.dangerSoft, iconBg: '#fbd5d5', fg: '#991b1b' },
  warning: { bg: colors.warningSoft, iconBg: '#fde68a', fg: '#92400e' },
  primary: { bg: colors.primarySoft, iconBg: '#cfe9ef', fg: colors.primaryDark },
  success: { bg: colors.successSoft, iconBg: '#A8D5E1', fg: colors.primaryDark },
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: 6,
  },
  pressed: { opacity: 0.85 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { fontSize: 24, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '600' },
});
