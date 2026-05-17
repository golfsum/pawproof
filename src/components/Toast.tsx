import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, spacing } from '@/theme';

// Lightweight toast that floats above the FAB. iOS has no native toast;
// rather than pull a snackbar dep, this fades in for ~2.5s and out.
// Callers control visibility with a string-or-null state.

interface Props {
  message: string | null;
  onHidden?: () => void;
  // Sits high enough to clear the FAB. Override per screen if the FAB
  // isn't present.
  bottomOffset?: number;
  tone?: 'default' | 'success';
}

const VISIBLE_MS = 2400;

export function Toast({ message, onHidden, bottomOffset = 100, tone = 'success' }: Props) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!message) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();

    const fadeTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translate, { toValue: 12, duration: 220, useNativeDriver: true }),
      ]).start(() => onHidden?.());
    }, VISIBLE_MS);

    return () => clearTimeout(fadeTimer);
  }, [message, opacity, translate, onHidden]);

  if (!message) return null;
  const bottom = bottomOffset + insets.bottom;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { bottom, opacity, transform: [{ translateY: translate }] },
      ]}
    >
      <View style={[styles.bubble, tone === 'success' ? styles.bubbleSuccess : styles.bubbleDefault]}>
        <Ionicons
          name={tone === 'success' ? 'checkmark-circle' : 'information-circle'}
          size={18}
          color={tone === 'success' ? '#fff' : colors.text}
        />
        <Text style={[styles.text, tone === 'success' ? { color: '#fff' } : { color: colors.text }]} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    alignItems: 'center',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    borderRadius: radius.pill,
    maxWidth: 480,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bubbleSuccess: {
    backgroundColor: colors.primary,
  },
  bubbleDefault: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontSize: 14,
    fontFamily: fonts.body.semibold,
    flexShrink: 1,
  },
});
