import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import { PrimaryButton } from './PrimaryButton';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  cta?: { label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap };
}

export function EmptyState({ icon = 'paw-outline', title, body, cta }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {cta ? (
        <PrimaryButton title={cta.label} onPress={cta.onPress} icon={cta.icon} style={styles.cta} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: 17, fontWeight: '600', color: colors.text, textAlign: 'center' },
  body: { fontSize: 14, color: colors.textMuted, textAlign: 'center', maxWidth: 280 },
  cta: { marginTop: spacing.md, alignSelf: 'stretch' },
});
