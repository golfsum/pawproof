import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '@/theme';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'warning' | 'danger' | 'success' | 'primary';
  style?: ViewStyle;
  small?: boolean;
}

export function Chip({ label, selected, onPress, icon, tone = 'default', style, small }: Props) {
  const toneStyles = TONE_STYLES[tone];
  const bg = selected ? toneStyles.selectedBg : toneStyles.bg;
  const fg = selected ? toneStyles.selectedFg : toneStyles.fg;
  const Comp: any = onPress ? Pressable : ((p: any) => <>{p.children}</>);
  return (
    <Comp
      onPress={onPress}
      style={({ pressed }: any) => [
        styles.base,
        small && styles.small,
        { backgroundColor: bg, borderColor: selected ? toneStyles.selectedFg : 'transparent' },
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={fg} style={{ marginRight: 6 }} /> : null}
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[styles.label, small && styles.labelSmall, { color: fg }]}
      >
        {label}
      </Text>
    </Comp>
  );
}

const TONE_STYLES: Record<NonNullable<Props['tone']>, {
  bg: string; fg: string; selectedBg: string; selectedFg: string;
}> = {
  default: {
    bg: colors.cardSubtle,
    fg: colors.text,
    selectedBg: colors.primary,
    selectedFg: '#fff',
  },
  primary: {
    bg: colors.primarySoft,
    fg: colors.primary,
    selectedBg: colors.primary,
    selectedFg: '#fff',
  },
  warning: {
    bg: colors.warningSoft,
    fg: '#92400e',
    selectedBg: colors.warning,
    selectedFg: '#fff',
  },
  danger: {
    bg: colors.dangerSoft,
    fg: '#991b1b',
    selectedBg: colors.danger,
    selectedFg: '#fff',
  },
  success: {
    bg: colors.successSoft,
    fg: '#1E6C80',
    selectedBg: colors.success,
    selectedFg: '#fff',
  },
};

const styles = StyleSheet.create({
  // More vertical padding + explicit minHeight gives the text room when
  // custom font metrics (Plus Jakarta Sans) need a taller line box than
  // the system fallback. overflow:hidden ensures ellipsis renders properly
  // when a parent maxWidth clips the label.
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    minHeight: 36,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  small: { paddingHorizontal: 10, paddingVertical: 6, minHeight: 28 },
  pressed: { opacity: 0.85 },
  // Explicit fontFamily + lineHeight prevents the vertical clipping that
  // shows when only `fontWeight: '600'` is set against a custom font.
  label: {
    fontFamily: fonts.body.semibold,
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
    textAlign: 'center',
  },
  labelSmall: { fontSize: 12, lineHeight: 16 },
});
