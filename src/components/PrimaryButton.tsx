import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  /** Text shown next to the spinner while loading (e.g. "Uploading…").
   *  Falls back to a bare spinner when omitted. */
  loadingLabel?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export function PrimaryButton({ title, onPress, loading, loadingLabel, disabled, variant = 'primary', icon, style }: Props) {
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle[] = [styles.base];
  let textColor = '#fff';

  if (variant === 'primary') {
    containerStyle.push(styles.primary);
  } else if (variant === 'secondary') {
    containerStyle.push(styles.secondary);
    textColor = colors.text;
  } else if (variant === 'ghost') {
    containerStyle.push(styles.ghost);
    textColor = colors.primary;
  } else if (variant === 'danger') {
    containerStyle.push(styles.danger);
  }

  if (isDisabled) containerStyle.push(styles.disabled);
  if (style) containerStyle.push(style);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [...containerStyle, pressed && !isDisabled && styles.pressed]}
    >
      {loading ? (
        <View style={styles.row}>
          <ActivityIndicator color={textColor} />
          {loadingLabel ? (
            <Text style={[styles.text, { color: textColor, marginLeft: spacing.sm }]}>{loadingLabel}</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={18} color={textColor} style={styles.icon} /> : null}
          <Text style={[styles.text, { color: textColor }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: spacing.sm },
  text: { fontSize: 16, fontWeight: '600' },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.cardSubtle },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
